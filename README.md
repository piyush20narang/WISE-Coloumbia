# WISE Columbia Website

Welcome to the WISE Columbia website repository. This is a static HTML/CSS/JS web application that uses **Vercel** for hosting and local development, and **Supabase** for managing dynamic content (Newsletters and Gallery Photos).

## 🚀 Running the Project Locally

We use the Vercel CLI to run the site locally. This ensures that our local environment (routing, clean URLs) matches the production environment perfectly.

1. **Install Vercel CLI** (if you haven't already):
   ```bash
   npm i -g vercel
   ```

2. **Start the Development Server**:
   Open a terminal in the project folder and run:
   ```bash
   vercel dev
   ```

3. **View the site**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📝 Managing Content via Supabase

All newsletters and gallery images are managed dynamically via the [Supabase Dashboard](https://supabase.com/dashboard). You don't need to write code to add a new article!

### 1. Publishing a Newsletter
1. **Prepare your content**: Format your newsletter text in **Markdown** (`.md`).
2. Go to **Table Editor** in Supabase and click on the `newsletters` table.
3. Click **Insert row** and fill in the fields:
   - `title`: The display name (e.g., *Chariot Festival of Joy 2026*).
   - `slug`: The URL identifier (e.g., *chariot-festival-of-joy-2026*). 
     ⚠️ *Warning: Ensure there are no spaces or hidden newlines at the very end of the slug.*
   - `date`: The date of the event (e.g., *2026-06-13*).
   - `category`: The category tag (e.g., *Chariot Festival*).
   - `body_md`: Paste your Markdown text here.
   - `cover_image_url`: (Optional) Public URL of an image to use as the header banner.
   - `published`: Toggle to **TRUE** (✅).
4. Click **Save**. The newsletter will immediately appear on the Resources page!

### 2. Uploading Photos (Newsletters & Gallery)
Images appear in both the Newsletter Carousel and the global Gallery page.

1. **Upload the file to Storage**:
   - Go to **Storage** in Supabase.
   - Upload your photo to your image bucket.
   - Once uploaded, copy the **Public URL** of the image.

2. **Link the photo in the database**:
   - Go to **Table Editor** > `newsletter_images`.
   - Click **Insert row** and fill in the fields:
     - `newsletter_id`: The database ID of the newsletter this image belongs to.
     - `url`: Paste the **Public URL** you copied from Storage.
     - `caption`: (Optional) Text that appears when viewing the image.
     - `sort_order`: Numbers (1, 2, 3...) to control the order in the carousel.
     - `category`: (e.g., *Chariot Festival*). Setting this ensures the image appears in the Gallery page under the correct filter!
3. Click **Save**. The image is now live.

### 3. Bulk Uploading Photos (Recommended)
If you have multiple photos for a newsletter, uploading and linking them one-by-one is tedious. You can upload an entire folder in one go using the built-in uploader script:

1. Place all your photos in a local folder (e.g., create a folder called `photos` in the project root).
2. Open a terminal in the project root and run:
   ```bash
   node scripts/bulk-upload.js
   ```
3. The script will:
   - Read the database URL from your config automatically.
   - Prompt you to paste your secret **service_role key** (found in Supabase Dashboard → Settings → API).
   - Prompt you for the **local folder path** (e.g., `./photos`).
   - Fetch your newsletters from the database and let you select one from a list.
   - Prompt you for a **category** tag (e.g., *Chariot Festival*).
   - Automatically upload all files, get public URLs, and insert the rows into the database in one single batch!

### 4. Link Photos Already Uploaded to Storage (Auto-Linker)
If you have already uploaded multiple photos directly via the Supabase Storage dashboard, you can auto-link them to a newsletter without writing out filenames or copying URLs manually:

1. Open a terminal in the project root and run:
   ```bash
   node scripts/link-existing.js
   ```
2. The script will:
   - Ask you to paste your secret **service_role key** (from Supabase settings).
   - Fetch the list of your newsletters and let you choose which one to link the files to.
   - Ask you for the **category** tag (e.g. *Chariot Festival*).
   - Scan the `newsletter-images` bucket in Storage, filter out any files that are already linked to prevent duplicate entries, and insert rows for all the new ones in one single batch!

---

## 🎨 Architecture & Styling
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript.
- **CSS Architecture**: Utility classes and custom CSS variables defined in `assets/css/style.css`.
- **Markdown Rendering**: Handled on the client side via `marked.js` CDN.
- **Database**: PostgreSQL (via Supabase) with Row-Level Security (RLS) configured to allow public reads and restrict writes.
