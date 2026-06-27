const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Helper to prompt user in console
function ask(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

// Map file extensions to standard MIME types
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.webp': return 'image/webp';
        case '.gif': return 'image/gif';
        case '.svg': return 'image/svg+xml';
        default: return 'application/octet-stream';
    }
}

async function main() {
    console.log('====================================================');
    console.log('   WISE Columbia — Supabase Bulk Image Uploader     ');
    console.log('====================================================\n');

    // 1. Read Supabase URL from supabase-config.js
    let supabaseUrl = '';
    try {
        const configContent = fs.readFileSync(path.join(__dirname, '../assets/js/supabase-config.js'), 'utf8');
        const match = configContent.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
            supabaseUrl = match[1];
        }
    } catch (e) {
        console.error('❌ Error: Could not read assets/js/supabase-config.js.');
        console.error('Make sure you run this script from the project root folder.');
        process.exit(1);
    }

    if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_ID')) {
        console.error('❌ Error: Supabase URL is not configured in assets/js/supabase-config.js.');
        process.exit(1);
    }

    console.log(`Connected to Supabase Project: ${supabaseUrl}\n`);

    // 2. Get Service Role Key
    console.log('To write to storage and database, we need your secret "service_role" key.');
    console.log('Find it in: Supabase Dashboard → Settings → API → service_role key (JWT section).\n');
    
    const serviceRoleKey = await ask('🔑 Paste your secret service_role key: ');
    if (!serviceRoleKey) {
        console.error('❌ Error: Service role key is required.');
        process.exit(1);
    }

    // 3. Select local directory
    const localDir = await ask('\n📁 Enter path to folder containing images (e.g. ./my-photos): ');
    if (!localDir || !fs.existsSync(localDir) || !fs.lstatSync(localDir).isDirectory()) {
        console.error('❌ Error: Invalid directory path.');
        process.exit(1);
    }

    // 4. Fetch newsletters to let the user select one
    console.log('\nFetching newsletters from database...');
    let newsletters = [];
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/newsletters?select=id,title,date&order=date.desc`, {
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            }
        });
        if (res.ok) {
            newsletters = await res.json();
        } else {
            const errText = await res.text();
            throw new Error(errText);
        }
    } catch (e) {
        console.error('❌ Error fetching newsletters:', e.message);
        console.log('Please double check your service_role key.');
        process.exit(1);
    }

    if (newsletters.length === 0) {
        console.log('⚠️ No newsletters found in the database. Please create a newsletter first.');
        process.exit(1);
    }

    console.log('\nSelect the newsletter to link these photos to:');
    newsletters.forEach((nl, i) => {
        console.log(`  [${i + 1}] ${nl.date} — ${nl.title}`);
    });
    console.log(`  [${newsletters.length + 1}] Enter a custom Newsletter ID (UUID)`);

    const selectionIndex = parseInt(await ask('\n🔢 Select option (number): '), 10);
    let targetNewsletterId = '';

    if (selectionIndex > 0 && selectionIndex <= newsletters.length) {
        targetNewsletterId = newsletters[selectionIndex - 1].id;
    } else if (selectionIndex === newsletters.length + 1) {
        targetNewsletterId = await ask('UUID of custom newsletter: ');
    } else {
        console.error('❌ Error: Invalid selection.');
        process.exit(1);
    }

    if (!targetNewsletterId) {
        console.error('❌ Error: Newsletter ID is required.');
        process.exit(1);
    }

    // 5. Ask for Category
    const category = await ask('\n🏷️ Enter category tag for Gallery (e.g. Chariot Festival): ');
    if (!category) {
        console.error('❌ Error: Category is required.');
        process.exit(1);
    }

    // 6. Scan files
    const files = fs.readdirSync(localDir);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return validExtensions.includes(ext) && !file.startsWith('.');
    });

    if (imageFiles.length === 0) {
        console.log('\n⚠️ No valid image files (.jpg, .png, etc.) found in that directory.');
        process.exit(0);
    }

    console.log(`\nFound ${imageFiles.length} images to upload. Starting process...\n`);

    const dbRecords = [];
    let uploadCount = 0;

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const localPath = path.join(localDir, file);
        
        // Sanitize filename to avoid weird character issues in URL
        const fileExt = path.extname(file);
        const fileBase = path.basename(file, fileExt).replace(/[^a-zA-Z0-9-]/g, '_');
        const timestamp = Date.now();
        const cleanFileName = `${fileBase}_${timestamp}${fileExt}`;

        console.log(`[${i + 1}/${imageFiles.length}] Uploading ${file} as ${cleanFileName}...`);

        try {
            const fileData = fs.readFileSync(localPath);
            const mimeType = getMimeType(localPath);

            // Upload request to Supabase Storage
            const bucketName = '2026 Chariot Festival of Joy';
            const encodedBucket = encodeURIComponent(bucketName);
            const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${encodedBucket}/${cleanFileName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': mimeType
                },
                body: fileData
            });

            if (!uploadRes.ok) {
                const errJson = await uploadRes.json();
                console.error(`  ❌ Failed to upload ${file}:`, errJson.message || uploadRes.statusText);
                continue;
            }

            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodedBucket}/${cleanFileName}`;
            console.log(`  ✅ Uploaded. Public URL: ${publicUrl}`);

            dbRecords.push({
                newsletter_id: targetNewsletterId,
                url: publicUrl,
                caption: fileBase.replace(/_/g, ' '),
                category: category,
                sort_order: i + 1
            });
            uploadCount++;

        } catch (err) {
            console.error(`  ❌ Error processing file ${file}:`, err.message);
        }
    }

    // 7. Save records in DB
    if (dbRecords.length > 0) {
        console.log(`\nSaving ${dbRecords.length} records to the database...`);
        try {
            const dbRes = await fetch(`${supabaseUrl}/rest/v1/newsletter_images`, {
                method: 'POST',
                headers: {
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(dbRecords)
            });

            if (dbRes.ok) {
                console.log('🎉 Success! All images successfully uploaded and linked to database.');
                console.log(`Uploaded images: ${uploadCount}/${imageFiles.length}`);
            } else {
                const errText = await dbRes.text();
                throw new Error(errText);
            }
        } catch (err) {
            console.error('❌ Error saving to database:', err.message);
            console.log('Storage files were uploaded, but database records were not created.');
        }
    } else {
        console.log('\n❌ No files were uploaded successfully.');
    }

    console.log('\nProcess finished. Press Ctrl+C to exit if terminal hangs.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Uncaught exception:', err);
    process.exit(1);
});
