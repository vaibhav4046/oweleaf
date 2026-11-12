#!/usr/bin/env python3
"""Farthing QLoRA fine-tune - designed for a FREE Google Colab T4 runtime.

Colab setup (one cell):
    !pip install -q unsloth datasets
    !python3 make_dataset.py        # uploads or generate here
    !python3 train_qlora.py

Trains qwen3-1.7b (ungated) with a rank-16 LoRA on the synthetic chase-decision
dataset, evaluates action+tone accuracy on the validation split, and exports a
GGUF adapter you can load into Ollama:

    ollama create farthing -f training/Modelfile

Everything this script prints is real: eval numbers come from the val split of
this run. If training fails on the free tier, the app still runs on the base
model or the heuristic ladder - the README says so honestly.
"""
import json
import random
from pathlib import Path

BASE_MODEL = "unsloth/Qwen3-1.7B-unsloth-bnb-4bit"
OUT_DIR = Path("farthing_lora")
MAX_LEN = 1024


def load_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f]


def main():
    from unsloth import FastLanguageModel
    from datasets import Dataset
    from trl import SFTTrainer
    from transformers import TrainingArguments

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=BASE_MODEL, max_seq_length=MAX_LEN, load_in_4bit=True,
    )
    model = FastLanguageModel.get_peft_model(
        model, r=16, lora_alpha=16, lora_dropout=0.0,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )

    def to_text(row):
        # EOS after the JSON completion is critical: without it the model never
        # learns to stop, generation rambles past the answer and parsing fails.
        return {"text": f"{row['prompt']}\n\n{row['completion']}{tokenizer.eos_token}"}

    train = Dataset.from_list([to_text(r) for r in load_jsonl("dataset_train.jsonl")])
    val_rows = load_jsonl("dataset_val.jsonl")

    trainer = SFTTrainer(
        model=model, tokenizer=tokenizer, train_dataset=train,
        dataset_text_field="text", max_seq_length=MAX_LEN,
        args=TrainingArguments(
            output_dir=str(OUT_DIR), per_device_train_batch_size=4,
            gradient_accumulation_steps=4, num_train_epochs=2,
            learning_rate=2e-4, logging_steps=20, save_strategy="no",
            fp16=True, report_to=[],
        ),
    )
    trainer.train()

    # Real validation: greedy-generate on the val prompts, parse, score action+tone.
    FastLanguageModel.for_inference(model)
    correct_action = correct_tone = parsed = 0
    for row in val_rows:
        expect = json.loads(row["completion"])
        inputs = tokenizer(row["prompt"] + "\n\n", return_tensors="pt").to(model.device)
        out = model.generate(**inputs, max_new_tokens=400, temperature=0.0, do_sample=False)
        text = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        try:
            start = text.index("{")
            end = text.index("}", start)  # FIRST closing brace: the answer, then stop
            pred = json.loads(text[start:end + 1])
            parsed += 1
            if pred.get("action") == expect.get("action"):
                correct_action += 1
                if expect.get("action") != "remind" or pred.get("tone") == expect.get("tone"):
                    correct_tone += 1
        except (ValueError, json.JSONDecodeError):
            pass

    n = len(val_rows)
    print(f"VAL parse-rate: {parsed}/{n} ({100*parsed/n:.1f}%)")
    print(f"VAL action accuracy: {correct_action}/{n} ({100*correct_action/n:.1f}%)")
    print(f"VAL action+tone accuracy: {correct_tone}/{n} ({100*correct_tone/n:.1f}%)")
    with open("val_metrics.json", "w") as f:
        json.dump({"val_n": n, "parse_rate": parsed / n, "action_accuracy": correct_action / n,
                   "action_tone_accuracy": correct_tone / n}, f, indent=2)
    print("VAL metrics saved to val_metrics.json")

    model.save_pretrained(str(OUT_DIR))
    tokenizer.save_pretrained(str(OUT_DIR))
    # GGUF export for Ollama (needs more disk; optional on free tier)
    try:
        model.save_pretrained_gguf("farthing_gguf", tokenizer, quantization_method="q4_k_m")
        print("GGUF exported to farthing_gguf/")
    except Exception as e:  # disk/quota limits on free tier are common - say so, don't hide it
        print(f"GGUF export skipped: {e}")


if __name__ == "__main__":
    main()
