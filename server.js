import 'dotenv/config'
import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const projectDirectory = path.dirname(fileURLToPath(import.meta.url))
const buildDirectory = path.join(projectDirectory, 'dist')

app.use(express.json({ limit: '1kb' }))

app.post('/api/skill-suggestions', async (_request, response) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    response.status(503).json({
      error: 'Skill suggestions are unavailable. Set GEMINI_API_KEY on the server.',
    })
    return
  }

  try {
    const models = [
      process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash',
    ]
    let geminiResponse

    for (const [index, model] of models.entries()) {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Suggest 10 professional skills for a software developer. Return only a JSON array of 10 concise skill names as strings.',
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        },
      )

      if (geminiResponse.ok || geminiResponse.status !== 404 || index === models.length - 1) {
        break
      }
    }

    if (!geminiResponse.ok) {
      response.status(502).json({
        error: `Gemini could not generate suggestions (HTTP ${geminiResponse.status}).`,
      })
      return
    }

    const result = await geminiResponse.json()
    const generatedText = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
    const parsedSuggestions = JSON.parse(generatedText)

    if (!Array.isArray(parsedSuggestions)) {
      throw new Error('Gemini returned an invalid suggestions list.')
    }

    const suggestions = [
      ...new Set(
        parsedSuggestions
          .filter((skill) => typeof skill === 'string')
          .map((skill) => skill.trim())
          .filter(Boolean),
      ),
    ].slice(0, 10)

    if (suggestions.length === 0) {
      throw new Error('Gemini returned an empty suggestions list.')
    }

    response.json({ suggestions })
  } catch (error) {
    console.error('Failed to fetch Gemini skill suggestions:', error)
    response.status(502).json({
      error: 'Could not load skill suggestions. Please try again later.',
    })
  }
})

if (existsSync(path.join(buildDirectory, 'index.html'))) {
  app.use(express.static(buildDirectory))
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(buildDirectory, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Resume builder server listening on port ${port}`)
})
