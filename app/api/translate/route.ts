import { NextResponse } from 'next/server';
// Usaremos una librería ligera que no requiere API Key
const { translate } = require('google-translate-api-x'); 

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, source, target } = body;

        if (!text) {
            return NextResponse.json({ error: 'Falta texto para traducir' }, { status: 400 });
        }

        // Traducir usando el motor de Google (Gratis & Robusto)
        const res = await translate(text, {
            from: source === 'auto' ? undefined : source,
            to: target,
            autoCorrect: true, // Corrige typos pequeños del dictado por voz
        });

        return NextResponse.json({ 
            original: text,
            translatedText: res.text,
            from: res.from.language.iso 
        });

    } catch (error) {
        console.error('Translation Error:', error);
        return NextResponse.json(
            { error: 'Error interno de traducción', details: String(error) }, 
            { status: 500 }
        );
    }
}
