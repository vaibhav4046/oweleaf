# Oweleaf: preliminary name screen

Checked 11 November 2026. Pronounced "owe-leaf". A working prototype name, not a legal clearance.

- Exact-name public web and qualified app/repository searches found no clear exact-name product. Fuzzy search returns are not absence proof.
- GitHub public repository search returned zero exact-query repositories.
- Apple's public software search returned fuzzy matches, no exact Oweleaf result in the returned set.
- Verisign .com RDAP endpoint returned 404 (no registry record at the check time). This does not reserve a domain, establish availability at checkout or grant a trademark.
- UK IPO's similar-word search for Oweleaf returned eight OneLeaf / one leaf / oneleaf.ai marks, including two class-9 oneleaf.ai registrations. No returned exact Oweleaf match. Similarity still requires professional assessment before commercial launch.
- DueKind was rejected because https://www.duekind.com/ is a direct approval-first invoice follow-up product. Flow and Dots are already widely used product names. No claim that approvals, reminders or local inference are unique inventions.

Observed sources:
https://trademarks.ipo.gov.uk/ipo-tmtext/page/Results (session-specific search results; query Oweleaf, Similar)
https://rdap.verisign.com/com/v1/domain/oweleaf.com
https://api.github.com/search/repositories?q=oweleaf
https://itunes.apple.com/search?term=oweleaf&entity=software&limit=5
https://www.duekind.com/
https://www.duekind.com/pricing

Internal compatibility names (FARTHING_* environment variables, model aliases, protocol identifiers) remain unchanged so existing runs still reproduce. Raw evaluation artifacts retain their original Farthing labels and dates. Oweleaf is the renamed application, not a newly retrained model.
