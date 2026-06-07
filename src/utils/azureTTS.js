export const playAzureTTS = async ({ text, ipa, voice, useIpa = false }) => {
    const key = 'E2Q3NX2r2Rq5zfihdypK7oAGlACQmcZUSe6XFqpUwUCn921BEE1PJQQJ99CFACZoyfiXJ3w3AAAYACOG4Hgr';
    const region = 'brazilsouth';

    if (!voice) {
        throw new Error('Azure TTS is not fully configured (missing voice).');
    }

    let actualVoice = voice;
    let actualUseIpa = useIpa;

    // If they picked the "IPA Reading" option, force useIpa to true and use a default neural voice
    if (voice === 'ipa-default') {
        actualVoice = 'en-US-JennyNeural';
        actualUseIpa = true;
    }

    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const escapeXml = (unsafe) => {
        return (unsafe || '').replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    };

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${actualVoice.substring(0, 5)}">
        <voice name="${actualVoice}">`;
        
    if (ipa && actualUseIpa) {
        ssml += `<phoneme alphabet="ipa" ph="${escapeXml(ipa)}">${escapeXml(text)}</phoneme>`;
    } else {
        ssml += escapeXml(text);
    }
    
    ssml += `</voice></speak>`;

    console.log('Sending SSML to Azure:', ssml);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            body: ssml
        });

        if (!response.ok) {
            const errorText = await response.text();
            
            // If Azure throws a 400 Bad Request while we tried to use IPA, 
            // it usually means the IPA string contained invalid/unsupported characters.
            // We should automatically fall back to reading just the text!
            if (response.status === 400 && ipa && actualUseIpa) {
                console.warn('Azure TTS rejected the IPA string (400). Falling back to normal text reading...');
                return playAzureTTS({ text, ipa: null, voice, useIpa: false });
            }
            
            throw new Error(`Azure TTS Error (${response.status}): ${errorText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };
            audio.play().catch(err => {
                URL.revokeObjectURL(url);
                reject(err);
            });
        });

    } catch (error) {
        console.error('TTS playback failed:', error);
        throw error;
    }
};
