import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { title, description, requirements } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const prompt = `Жоба тақырыбы: ${title}
Жоба сипаттамасы: ${description}
Жоба талаптары: ${requirements || 'Жоқ'}

Осы жобаны білім беру тұрғысынан талдап, келесі сұрақтарға қазақ тілінде жауап бер:
1. Жобаның күшті жақтары
2. Жақсартуға болатын тұстары
3. Қолданылатын дағдылар

Жауапты құрылымдалған мәтін түрінде қысқа және нақты етіп қайтар.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
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

    return NextResponse.json({ analysis: aiText })
  } catch (error: any) {
    console.error('AI project analysis endpoint error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
