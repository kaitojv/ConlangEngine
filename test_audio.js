import { IPA_INFO } from './src/utils/ipaData.js';

async function checkAudioLinks() {
    const broken = [];
    for (const [phoneme, info] of Object.entries(IPA_INFO)) {
        if (info.audio) {
            try {
                const res = await fetch(info.audio, { method: 'HEAD' });
                if (!res.ok) {
                    broken.push({ phoneme, name: info.name, url: info.audio });
                }
            } catch (e) {
                broken.push({ phoneme, name: info.name, url: info.audio, error: e.message });
            }
        }
    }
    console.log(JSON.stringify(broken, null, 2));
}

checkAudioLinks();
