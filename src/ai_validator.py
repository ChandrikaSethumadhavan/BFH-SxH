import sys
import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Mocking pdftotext for the sake of the script if not available, 
# but we will assume the input is a text file for this specific test 
# or use subprocess to call pdftotext if it's a pdf.

def load_rules(config_path):
    with open(config_path, 'r') as f:
        return json.load(f)

def extract_text_from_pdf(pdf_path):
    # Simple wrapper around pdftotext
    import subprocess
    try:
        result = subprocess.run(['pdftotext', pdf_path, '-'], capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error extracting text from PDF: {e}")
        return None
    except FileNotFoundError:
        print("Error: pdftotext command not found.")
        return None

def validate_sanity(text, rules):
    print("--- Starting Sanity Check ---")
    missing_sections = []
    for section_rule in rules.get("required_sections", []):
        # Handle both old string format (for backward compatibility) and new object format
        if isinstance(section_rule, str):
            alternatives = [section_rule]
            section_id = section_rule
        else:
            alternatives = section_rule.get("alternatives", [])
            section_id = section_rule.get("id", "Unknown Section")

        found = False
        for alt in alternatives:
            # More robust regex: Look for the section header on its own line (ignoring leading/trailing whitespace)
            # or followed by a colon.
            pattern = r'^\s*' + re.escape(alt) + r'\s*(:)?\s*$'
            if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                found = True
                break
        
        if not found:
            missing_sections.append(section_id)
    
    if missing_sections:
        print(f"❌ Missing required sections: {', '.join(missing_sections)}")
        return False
    
    print("✅ All required sections present.")
    return True

def validate_content_with_ai(text, rules):
    print("\n--- Starting AI Content Validation ---")
    
    api_key = os.getenv("OPEN_ROUTER_API")
    if not api_key:
        print("⚠️  OPEN_ROUTER_API key not found in .env. Skipping AI validation.")
        return True # Fail open or closed? Let's say pass with warning for now.

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

    print("ℹ️  Sending text to AI for logic verification...")
    
    # Dynamically build the list of sections from the rules
    section_descriptions = []
    for section_rule in rules.get("required_sections", []):
        if isinstance(section_rule, str):
            section_descriptions.append(f"- {section_rule}")
        else:
            main_id = section_rule.get("id")
            alts = section_rule.get("alternatives", [])
            # Filter out the main_id from alts if present to avoid redundancy
            other_alts = [a for a in alts if a != main_id]
            if other_alts:
                section_descriptions.append(f"- {main_id} (or synonyms like: {', '.join(other_alts)})")
            else:
                section_descriptions.append(f"- {main_id}")
    
    sections_prompt_str = "\n".join(section_descriptions)

    try:
        # Legal requirements context from the Merkblatt
        legal_context = """
        LEGAL REQUIREMENTS (from Merkblatt):
        1. Comprehensibility: The report must be understandable by a medically trained third party.
        2. Completeness: Essential medical data, facts, and the course of the operation must be documented.
        3. Specifics:
           - Operation technique/method.
           - Essential steps.
           - Deviations from normal course, complications, unexpected incidents.
           - Post-operative instructions to nursing staff (Weiteres Prozedere).
        4. Timing: Prompt creation (implied).
        """

        completion = client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a medical expert validator. Your task is to check the following surgical report for logical consistency, plausibility, and LEGAL COMPLIANCE based on the provided requirements.\n\n{legal_context}\n\nREQUIRED SECTIONS TO ANALYZE:\n{sections_prompt_str}\n\nTASK:\n1. EXTRACT the content for the sections listed above. If a section is found under a synonym, map it to the standard name.\n2. CHECK FOR CONTENT: If a required section header is present but has NO CONTENT (empty or just the header), or if the section is missing entirely, you MUST mark 'legal_check' as 'FAIL' and 'final_verdict' as 'INVALID'.\n3. Verify logical consistency (e.g. does the Procedure match the Diagnosis?)\n4. Verify legal compliance (comprehensibility, specifics).\n\nOutput your analysis in JSON format with the following keys:\n- 'extracted_sections': object (keys are section names, values are extracted content or null)\n- 'logic_check': string ('PASS' or 'FAIL')\n- 'legal_check': string ('PASS' or 'FAIL')\n- 'reason': string\n- 'final_verdict': string ('VALID' or 'INVALID')"
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            response_format={"type": "json_object"}
        )
        
        response_content = completion.choices[0].message.content
        # Clean markdown code blocks if present
        response_content = re.sub(r'^```json\s*', '', response_content, flags=re.MULTILINE)
        response_content = re.sub(r'^```\s*', '', response_content, flags=re.MULTILINE)
        response_content = re.sub(r'\s*```$', '', response_content, flags=re.MULTILINE)
        response_content = response_content.strip()

        try:
            response_json = json.loads(response_content)
            
            # Create a summary for display to avoid printing the full extracted text
            display_summary = {k: v for k, v in response_json.items() if k != 'extracted_sections'}
            if 'extracted_sections' in response_json:
                display_summary['extracted_sections'] = list(response_json['extracted_sections'].keys())
            
            print(f"🤖 AI Response Summary: {json.dumps(display_summary, indent=2)}")

            if response_json.get("final_verdict") == "VALID":
                 print("✅ AI Verification: The report seems logically consistent.")
                 return True
            else:
                 print(f"❌ AI Verification: The report was flagged as invalid. Reason: {response_json.get('reason')}")
                 return False
        except json.JSONDecodeError:
            print(f"❌ AI Verification: Could not parse AI response. Raw content:\n{response_content}")
            return False

    except Exception as e:
        print(f"❌ Error calling AI API: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python src/ai_validator.py <path_to_report.pdf_or_txt>")
        sys.exit(1)

    file_path = sys.argv[1]
    config_path = os.path.join(os.path.dirname(__file__), "../config/validation_rules.json")
    
    rules = load_rules(config_path)
    
    print(f"Validating file: {file_path}")
    
    text = ""
    if file_path.lower().endswith('.pdf'):
        text = extract_text_from_pdf(file_path)
        if text is None:
            sys.exit(1)
    else:
        # Assume text file for testing
        try:
            with open(file_path, 'r') as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: File not found: {file_path}")
            sys.exit(1)

    is_sanity_valid = validate_sanity(text, rules)
    
    if is_sanity_valid:
        is_content_valid = validate_content_with_ai(text, rules)
        if is_content_valid:
            print("\n🎉 Report Validation PASSED.")
            sys.exit(0)
        else:
            print("\n⚠️ Report Validation FAILED (AI Check).")
            sys.exit(1)
    else:
        print("\n⚠️ Report Validation FAILED (Sanity Check).")
        sys.exit(1)

if __name__ == "__main__":
    main()
