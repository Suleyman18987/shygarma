import { NextResponse } from 'next/server'

function prepareContents(messagesList: any[]) {
  // Gemini requires the conversation to start with 'user' role
  let startIndex = 0
  while (startIndex < messagesList.length && messagesList[startIndex].role !== 'user') {
    startIndex++
  }

  const filtered = messagesList.slice(startIndex)
  if (filtered.length === 0) {
    return []
  }

  // Gemini requires strictly alternating roles ('user' and 'model')
  const result: any[] = []
  for (const msg of filtered) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    
    if (result.length > 0 && result[result.length - 1].role === role) {
      // Merge consecutive messages of the same role
      result[result.length - 1].parts[0].text += '\n\n' + msg.content
    } else {
      result.push({
        role,
        parts: [{ text: msg.content }]
      })
    }
  }

  return result
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const contents = prepareContents(messages)

    if (contents.length === 0) {
      return NextResponse.json({ error: 'No user messages provided' }, { status: 400 })
    }

    const systemInstruction = 'Сен DarynSpace білім беру платформасының AI-ассистентісің. Мұғалімдерге тапсырма жасауға, жоба идеяларын ұсынуға, оқушылардың прогресін талдауға көмектесесің. Жауаптарыңды қазақ тілінде бер. Қысқа және нақты жауап бер.'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
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

    return NextResponse.json({ response: aiText })
  } catch (error: any) {
    console.error('AI chat endpoint error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
