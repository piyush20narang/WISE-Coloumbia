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

async function main() {
    console.log('====================================================');
    console.log('    WISE Columbia — Link Existing Storage Photos     ');
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
    console.log('To read storage and write to the database, we need your secret "service_role" key.');
    console.log('Find it in: Supabase Dashboard → Settings → API → service_role key (JWT section).\n');
    
    const serviceRoleKey = await ask('🔑 Paste your secret service_role key: ');
    if (!serviceRoleKey) {
        console.error('❌ Error: Service role key is required.');
        process.exit(1);
    }

    // 3. Fetch newsletters to let the user select one
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

    // 4. Ask for Category
    const category = await ask('\n🏷️ Enter category tag for Gallery (e.g. Chariot Festival): ');
    if (!category) {
        console.error('❌ Error: Category is required.');
        process.exit(1);
    }

    // 5. Fetch existing images in DB to avoid duplicate linking
    console.log('\nFetching existing image records to prevent duplicates...');
    let existingUrls = new Set();
    try {
        const dbRes = await fetch(`${supabaseUrl}/rest/v1/newsletter_images?select=url`, {
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            }
        });
        if (dbRes.ok) {
            const dbData = await dbRes.json();
            dbData.forEach(row => existingUrls.add(row.url));
        } else {
            console.warn('⚠️ Warning: Could not fetch existing database records, duplicates may be inserted.');
        }
    } catch (e) {
        console.warn('⚠️ Warning: Could not fetch existing database records:', e.message);
    }

    // 5. Fetch storage buckets to select the target bucket
    console.log('\nFetching storage buckets...');
    let buckets = [];
    try {
        const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            }
        });
        if (res.ok) {
            buckets = await res.json();
        } else {
            const errText = await res.text();
            throw new Error(errText);
        }
    } catch (e) {
        console.error('❌ Error fetching storage buckets:', e.message);
        process.exit(1);
    }

    if (buckets.length === 0) {
        console.error('❌ Error: No storage buckets found. Please create a bucket in the Supabase Dashboard first.');
        process.exit(1);
    }

    let targetBucketId = '';
    if (buckets.length === 1) {
        targetBucketId = buckets[0].id;
        console.log(`Using storage bucket: "${targetBucketId}"`);
    } else {
        console.log('\nSelect the storage bucket containing the uploaded photos:');
        buckets.forEach((b, i) => {
            console.log(`  [${i + 1}] ${b.name} (${b.public ? 'Public' : 'Private'})`);
        });
        const bucketSelection = parseInt(await ask('\n🔢 Select option (number): '), 10);
        if (bucketSelection > 0 && bucketSelection <= buckets.length) {
            targetBucketId = buckets[bucketSelection - 1].id;
        } else {
            console.error('❌ Error: Invalid selection.');
            process.exit(1);
        }
    }

    // 6. List all files currently in the target Storage bucket
    console.log(`\nQuerying Supabase Storage for files in bucket "${targetBucketId}"...`);
    let storageFiles = [];
    try {
        const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(targetBucketId)}`, {
            method: 'POST',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prefix: "",
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
            })
        });

        if (storageRes.ok) {
            storageFiles = await storageRes.json();
        } else {
            const errText = await storageRes.text();
            throw new Error(errText);
        }
    } catch (e) {
        console.error('❌ Error listing storage files:', e.message);
        process.exit(1);
    }

    if (storageFiles.length === 0) {
        console.log(`⚠️ No files found in the "${targetBucketId}" storage bucket.`);
        process.exit(0);
    }

    // Filter files and generate database insert records
    const dbRecords = [];
    storageFiles.forEach((file, index) => {
        // Skip folders or placeholder files if any
        if (!file.name || file.name === '.emptyFolderPlaceholder') return;

        // Construct public URL (properly encoding special characters like spaces in filename)
        const encodedBucket = encodeURIComponent(targetBucketId);
        const encodedName = encodeURIComponent(file.name);
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodedBucket}/${encodedName}`;

        if (existingUrls.has(publicUrl)) {
            console.log(`  (Skipping ${file.name} — already linked in database)`);
            return;
        }

        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-]/g, ' ');

        dbRecords.push({
            newsletter_id: targetNewsletterId,
            url: publicUrl,
            caption: baseName,
            category: category,
            sort_order: index + 1
        });
    });

    if (dbRecords.length === 0) {
        console.log('\n✅ All files in storage are already linked to the database! Nothing to do.');
        process.exit(0);
    }

    console.log(`\nFound ${dbRecords.length} new files in storage that need to be linked.`);
    console.log('Here is the list of files to link:');
    dbRecords.forEach(rec => {
        console.log(`  - ${path.basename(rec.url)}`);
    });

    const confirm = await ask('\n❓ Link these photos to the database now? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('❌ Cancelled.');
        process.exit(0);
    }

    // 7. Save records in DB
    console.log('\nSaving records to the database...');
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
            console.log(`🎉 Success! Linked all ${dbRecords.length} new photos in one go!`);
        } else {
            const errText = await dbRes.text();
            throw new Error(errText);
        }
    } catch (err) {
        console.error('❌ Error saving to database:', err.message);
    }

    console.log('\nProcess finished.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Uncaught exception:', err);
    process.exit(1);
});
