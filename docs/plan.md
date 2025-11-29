### Plan for the Report Validator

1.  **Define the Report Schema**: [COMPLETED] We defined the required sections in `config/validation_rules.json`.
2.  **Create a 'Sanity Check' Validator**: [COMPLETED] We built `src/ai_validator.py` which extracts text from PDF and checks for the presence of required sections.
3.  **Develop an AI-powered 'Relevance' Validator**: [COMPLETED] We integrated Open Router (using `google/gemini-2.0-flash-001`) into `src/ai_validator.py` to verify the logical consistency of the report content.

# Pipeline Example
1. Report as pdf comes in
2. Report is checked for 'sanity'. Basic structure is correct, form is fitting, the requirements given by law are fulfilled, etc.
3. Once the report passes the sanity check, we need to validate the overall correctness. Check that the report actually makes sense.

# Additional Ideas
- [COMPLETED] Make sure that the json schema is editable. `config/validation_rules.json` allows customization of required sections.
- [COMPLETED] We use Open Router to verify the overall correctness of the analyzed document.