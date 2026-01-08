
export { };
const PISTON_API = 'http://127.0.0.1:2000';

async function main() {
    console.log(`Testing connection to ${PISTON_API}...`);
    try {
        const res = await fetch(`${PISTON_API}/api/v2/runtimes`);
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Runtimes found:', data.length);
            console.log('First 3:', data.slice(0, 3));
        } else {
            console.log('Error text:', await res.text());
        }
    } catch (e) {
        console.error('Connection failed:', e);
    }
}

main();
