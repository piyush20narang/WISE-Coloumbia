const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
    console.log('   WISE Columbia — Rename Category in Supabase DB   ');
    console.log('====================================================\n');

    let supabaseUrl = '';
    try {
        const configContent = fs.readFileSync(path.join(__dirname, '../assets/js/supabase-config.js'), 'utf8');
        const match = configContent.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
        if (match) supabaseUrl = match[1];
    } catch (e) {
        console.error('❌ Error: Could not read assets/js/supabase-config.js.');
        process.exit(1);
    }

    console.log(`Connected to Supabase Project: ${supabaseUrl}\n`);
    console.log('To update records in the database, we need your secret "service_role" key.');
    console.log('Find it in: Supabase Dashboard → Settings → API → service_role key (JWT section).\n');

    const serviceRoleKey = await ask('🔑 Paste your secret service_role key: ');
    if (!serviceRoleKey) {
        console.error('❌ Error: Service role key is required.');
        process.exit(1);
    }

    const oldCategory = '2026 Chariot Festival of Joy';
    const newCategory = '2026 Chariot Festival of joy - Kids';

    console.log(`\nRenaming category from "${oldCategory}" to "${newCategory}"...`);

    try {
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/newsletter_images?category=eq.${encodeURIComponent(oldCategory)}`, {
            method: 'PATCH',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ category: newCategory })
        });

        if (updateRes.ok) {
            const data = await updateRes.json();
            console.log(`🎉 Success! Updated ${data.length} records to "${newCategory}".`);
        } else {
            const errText = await updateRes.text();
            throw new Error(errText);
        }
    } catch (err) {
        console.error('❌ Error updating database records:', err.message);
    }

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Uncaught exception:', err);
    process.exit(1);
});
