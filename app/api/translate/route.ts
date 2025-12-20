import { NextResponse } from 'next/server';

// Usamos el nombre exacto que tienes en tu .env
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY; 

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, target } = body;

        if (!text || !target) {
            return NextResponse.json({ error: 'Faltan datos (texto o idioma destino)' }, { status: 400 });
        }

        if (!GOOGLE_API_KEY) {
            console.error("❌ ERROR CRÍTICO: No hay API KEY de Google configurada.");
            return NextResponse.json({ error: 'Servidor mal configurado (Falta API Key)' }, { status: 500 });
        }

        // LLAMADA OFICIAL A GOOGLE CLOUD TRANSLATE API (V2)
        const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                target: target,
                format: 'text'
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const translatedText = data.data.translations[0].translatedText;

        return NextResponse.json({ 
            original: text,
            translatedText: translatedText
        });

    } catch (error: any) {
        console.error('Translation Error (Google Cloud):', error);
        return NextResponse.json(
            { error: 'Error traduciendo', details: error.message }, 
            { status: 500 }
        );
    }
}
