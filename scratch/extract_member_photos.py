import os
import zipfile
import shutil

members = {
    "Parijat Ghosh.docx": "Parijat_Ghosh",
    "Niraj Arora.docx": "Niraj_Arora",
    "Garima Revised Profile.docx": "Garima",
    "Rachna Aneja Arora, Biomedical and Spiritual Scientist.docx": "Rachna",
    "Nadia Kishore Das.docx": "Nadia",
    "Lal Gopaal Das.docx": "Lal_Gopal",
    "Buddhimanta Das.docx": "Buddhimanta"
}

source_dir = "/Users/namanopedia/Downloads/Board of Directors and Executive Board CV"
target_dir = "/Users/namanopedia/WiseWebsite/assets/images/members"
os.makedirs(target_dir, exist_ok=True)

for doc_name, member_id in members.items():
    doc_path = os.path.join(source_dir, doc_name)
    if os.path.exists(doc_path):
        try:
            with zipfile.ZipFile(doc_path, 'r') as zip_ref:
                media_files = [f for f in zip_ref.namelist() if f.startswith('word/media/')]
                if media_files:
                    # Take the first image found
                    image_name = media_files[0]
                    ext = os.path.splitext(image_name)[1]
                    target_path = os.path.join(target_dir, f"{member_id}{ext}")
                    with zip_ref.open(image_name) as source, open(target_path, 'wb') as target:
                        shutil.copyfileobj(source, target)
                    print(f"Extracted image for {member_id}: {target_path}")
                else:
                    print(f"No image found for {member_id}")
        except Exception as e:
            print(f"Error processing {doc_name}: {e}")
    else:
        print(f"File not found: {doc_path}")
