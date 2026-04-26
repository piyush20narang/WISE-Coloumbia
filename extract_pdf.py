import sys
try:
    import pypdf
except ImportError:
    print("pypdf not found")
    sys.exit(1)

def extract_text(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

if __name__ == "__main__":
    print(extract_text(sys.argv[1]))
