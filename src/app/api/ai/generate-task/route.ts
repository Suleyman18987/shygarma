import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { subject, grade, difficulty, type } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const prompt = `Сынып: ${grade}, Пән: ${subject}, Қиындық деңгейі: ${difficulty}, Тапсырма типі: ${type}.
Осы параметрлерге сәйкес қазақ тілінде білім беру тапсырмасын жаса.
Тапсырма форматы JSON түрінде келесі құрылыммен болуы керек:
{
  "title": "Тапсырма тақырыбы",
  "description": "Тапсырманың толық сипаттамасы мен нұсқаулығы",
  "points": 10,
  "options": [
    { "text": "Жауап 1", "correct": false },
    { "text": "Жауап 2", "correct": true }
  ],
  "correctAnswer": "Дұрыс жауап мәтіні"
}
Егер типі 'test' болса, 'options' массивінде міндетті түрде бір дұрыс нұсқа болуы керек. Егер типі 'test' болмаса, 'options' массивін бос қалдырыңыз.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json({ error: 'Failed to communicate with Gemini API' }, { status: 502 })
    }

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsedTask = JSON.parse(aiText)

    return NextResponse.json({ task: parsedTask })
  } catch (error: any) {
    console.error('AI task generation endpoint error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
