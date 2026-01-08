
export { };
const PISTON_API = 'http://127.0.0.1:2000';

const install = async (lang: string, version: string) => {
    console.log(`Installing ${lang} ${version}...`);
    const res = await fetch(`${PISTON_API}/api/v2/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language: lang,
            version: version
        })
    });
    if (res.ok) {
        console.log(`Success: ${lang} installed.`);
        const data = await res.json();
        console.log(JSON.stringify(data));
    } else {
        console.log(`Failed: ${res.status} ${await res.text()}`);
    }
}

async function main() {
    // Check what is available first? 
    // Actually Piston API allows listing available packages via separate endpoint usually?
    // Let's try to install 3.10.0 and 18.15.0
    await install('python', '3.10.0');
    await install('node', '18.15.0');

    // Check installed
    const res = await fetch(`${PISTON_API}/api/v2/runtimes`);
    console.log('Installed runtimes:', await res.json());
}

main();
