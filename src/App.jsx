import { useEffect, useState } from 'react'

function createResumePdf(resumeData, skills, jsPDF) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  let y = 22

  function addText(
    text,
    { size = 10, style = 'normal', color = [51, 65, 85], gap = 5 } = {},
  ) {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    const lines = pdf.splitTextToSize(text, contentWidth)
    const lineHeight = size * 0.45

    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage()
        y = margin
      }
      pdf.text(line, margin, y)
      y += lineHeight
    }

    y += gap
  }

  function addSection(title) {
    if (y > margin) y += 3
    if (y + 10 > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(79, 70, 229)
    pdf.text(title.toUpperCase(), margin, y)
    y += 2
    pdf.setDrawColor(203, 213, 225)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
  }

  const name = resumeData.personalInfo.name.trim()
  addText(name || 'Resume', {
    size: 24,
    style: 'bold',
    color: [15, 23, 42],
    gap: 8,
  })

  const contactDetails = [
    resumeData.personalInfo.email.trim(),
    resumeData.personalInfo.phone.trim(),
  ].filter(Boolean)

  if (contactDetails.length > 0) {
    addText(contactDetails.join('  |  '), {
      color: [71, 85, 105],
      gap: 8,
    })
  }

  const educationEntries = resumeData.education.filter((item) =>
    [item.schoolName, item.degree, item.graduationYear].some((value) =>
      value.trim(),
    ),
  )
  if (educationEntries.length > 0) {
    addSection('Education')
    for (const item of educationEntries) {
      const heading = [item.degree.trim(), item.schoolName.trim()]
        .filter(Boolean)
        .join(' - ')
      if (heading) addText(heading, { style: 'bold', gap: 2 })
      if (item.graduationYear.trim()) {
        addText(`Graduation year: ${item.graduationYear.trim()}`, {
          color: [71, 85, 105],
        })
      }
    }
  }

  const experienceEntries = resumeData.experience.filter((item) =>
    [item.jobTitle, item.company, item.startDate, item.endDate].some(
      (value) => value.trim(),
    ),
  )
  if (experienceEntries.length > 0) {
    addSection('Experience')
    for (const item of experienceEntries) {
      const heading = [item.jobTitle.trim(), item.company.trim()]
        .filter(Boolean)
        .join(' - ')
      if (heading) addText(heading, { style: 'bold', gap: 2 })
      const dates = [item.startDate, item.endDate]
        .filter(Boolean)
        .map((date) => date.split('-').reverse().join('/'))
        .join(' - ')
      if (dates) addText(dates, { color: [71, 85, 105] })
    }
  }

  const addedSkills = skills.map((skill) => skill.trim()).filter(Boolean)
  if (addedSkills.length > 0) {
    addSection('Skills')
    addText(addedSkills.join(', '), { gap: 0 })
  }

  const fileName = (name || 'resume')
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
    .join('')
    .trim()
    .replace(/[. ]+$/g, '') || 'resume'
  pdf.save(`${fileName}-resume.pdf`)
}

function App() {
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
    },
    education: [{
      schoolName: '',
      degree: '',
      graduationYear: '',
    }],
    experience: [{
      jobTitle: '',
      company: '',
      startDate: '',
      endDate: '',
    }],
  })
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [suggestedSkills, setSuggestedSkills] = useState([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true)
  const [suggestionError, setSuggestionError] = useState('')
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch('/api/skill-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Suggest 10 professional skills for a software developer.',
          }),
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Could not load skill suggestions.')
        }

        setSuggestedSkills(result.suggestions)
      } catch (error) {
        setSuggestionError(
          error instanceof Error
            ? error.message
            : 'Could not load skill suggestions.',
        )
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    fetchSuggestions()
  }, [])

  function handlePersonalInfoChange(field) {
    return (event) => {
      setResumeData((currentData) => ({
        ...currentData,
        personalInfo: {
          ...currentData.personalInfo,
          [field]: event.target.value,
        },
      }))
    }
  }

  function handleListChange(section, index, field) {
    return (event) => {
      setResumeData((currentData) => ({
        ...currentData,
        [section]: currentData[section].map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, [field]: event.target.value }
            : item,
        ),
      }))
    }
  }

  function addEntry(section, emptyEntry) {
    setResumeData((currentData) => ({
      ...currentData,
      [section]: [...currentData[section], { ...emptyEntry }],
    }))
  }

  function removeEntry(section, index) {
    setResumeData((currentData) => ({
      ...currentData,
      [section]: currentData[section].filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }))
  }

  function addSkill() {
    const skill = skillInput.trim()

    if (!skill) return

    setSkills((currentSkills) => [...currentSkills, skill])
    setSkillInput('')
  }

  function addSuggestedSkill(skill) {
    setSkills((currentSkills) =>
      currentSkills.some(
        (currentSkill) => currentSkill.toLowerCase() === skill.toLowerCase(),
      )
        ? currentSkills
        : [...currentSkills, skill],
    )
  }

  async function downloadResumePdf() {
    try {
      const { jsPDF } = await import('jspdf')
      createResumePdf(resumeData, skills, jsPDF)
      setPdfError('')
    } catch (error) {
      console.error('Failed to generate resume PDF:', error)
      setPdfError('Could not generate the PDF. Please try again.')
    }
  }

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-lg shadow-slate-900/10 sm:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Resume builder
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Build your resume
          </h1>
          <p className="mt-2 text-slate-600">
            Add your details below to get started.
          </p>
        </header>

        <form className="space-y-8" onSubmit={(event) => event.preventDefault()}>
          <section aria-labelledby="personal-info-heading">
            <h2
              id="personal-info-heading"
              className="mb-4 text-xl font-semibold text-slate-900"
            >
              Personal information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Name
                <input
                  className={inputClassName}
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={resumeData.personalInfo.name}
                  onChange={handlePersonalInfoChange('name')}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email
                <input
                  className={inputClassName}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={resumeData.personalInfo.email}
                  onChange={handlePersonalInfoChange('email')}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Phone
                <input
                  className={inputClassName}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  value={resumeData.personalInfo.phone}
                  onChange={handlePersonalInfoChange('phone')}
                />
              </label>
            </div>
          </section>

          <section aria-labelledby="education-heading">
            <h2
              id="education-heading"
              className="mb-4 text-xl font-semibold text-slate-900"
            >
              Education
            </h2>
            <div className="space-y-4">
              {resumeData.education.map((education, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-slate-800">
                      Education {index + 1}
                    </h3>
                    <button
                      className="text-sm font-medium text-rose-600 hover:text-rose-700"
                      type="button"
                      onClick={() => removeEntry('education', index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                      School name
                      <input
                        className={inputClassName}
                        type="text"
                        name={`schoolName-${index}`}
                        placeholder="School or university"
                        value={education.schoolName}
                        onChange={handleListChange(
                          'education',
                          index,
                          'schoolName',
                        )}
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Degree
                      <input
                        className={inputClassName}
                        type="text"
                        name={`degree-${index}`}
                        placeholder="Degree or qualification"
                        value={education.degree}
                        onChange={handleListChange(
                          'education',
                          index,
                          'degree',
                        )}
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Graduation year
                      <input
                        className={inputClassName}
                        type="text"
                        name={`graduationYear-${index}`}
                        inputMode="numeric"
                        placeholder="2024"
                        value={education.graduationYear}
                        onChange={handleListChange(
                          'education',
                          index,
                          'graduationYear',
                        )}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                type="button"
                onClick={() =>
                  addEntry('education', {
                    schoolName: '',
                    degree: '',
                    graduationYear: '',
                  })
                }
              >
                Add Education
              </button>
            </div>
          </section>

          <section aria-labelledby="experience-heading">
            <h2
              id="experience-heading"
              className="mb-4 text-xl font-semibold text-slate-900"
            >
              Experience
            </h2>
            <div className="space-y-4">
              {resumeData.experience.map((experience, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-slate-800">
                      Experience {index + 1}
                    </h3>
                    <button
                      className="text-sm font-medium text-rose-600 hover:text-rose-700"
                      type="button"
                      onClick={() => removeEntry('experience', index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Job title
                      <input
                        className={inputClassName}
                        type="text"
                        name={`jobTitle-${index}`}
                        placeholder="Your role"
                        value={experience.jobTitle}
                        onChange={handleListChange(
                          'experience',
                          index,
                          'jobTitle',
                        )}
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Company
                      <input
                        className={inputClassName}
                        type="text"
                        name={`company-${index}`}
                        placeholder="Company name"
                        value={experience.company}
                        onChange={handleListChange(
                          'experience',
                          index,
                          'company',
                        )}
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Start date
                      <input
                        className={inputClassName}
                        type="date"
                        name={`startDate-${index}`}
                        value={experience.startDate}
                        onChange={handleListChange(
                          'experience',
                          index,
                          'startDate',
                        )}
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      End date
                      <input
                        className={inputClassName}
                        type="date"
                        name={`endDate-${index}`}
                        value={experience.endDate}
                        onChange={handleListChange(
                          'experience',
                          index,
                          'endDate',
                        )}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                type="button"
                onClick={() =>
                  addEntry('experience', {
                    jobTitle: '',
                    company: '',
                    startDate: '',
                    endDate: '',
                  })
                }
              >
                Add Experience
              </button>
            </div>
          </section>

          <section aria-labelledby="skills-heading">
            <h2
              id="skills-heading"
              className="mb-4 text-xl font-semibold text-slate-900"
            >
              Skills
            </h2>
            <label className="block text-sm font-medium text-slate-700">
              Add a skill
              <div className="mt-1 flex gap-2">
                <input
                  className={`${inputClassName} mt-0`}
                  type="text"
                  name="skillInput"
                  placeholder="e.g. Project management"
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                />
                <button
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  type="button"
                  onClick={addSkill}
                >
                  Add skill
                </button>
              </div>
            </label>
            <div className="mt-4" aria-live="polite">
              {isLoadingSuggestions && (
                <p className="text-sm text-slate-500">
                  Loading skill suggestions…
                </p>
              )}
              {suggestionError && (
                <p className="text-sm text-rose-600" role="alert">
                  {suggestionError}
                </p>
              )}
              {suggestedSkills.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Suggested skills
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {suggestedSkills.map((skill) => {
                      const alreadyAdded = skills.some(
                        (addedSkill) =>
                          addedSkill.toLowerCase() === skill.toLowerCase(),
                      )

                      return (
                        <li
                          key={skill}
                          className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
                        >
                          {skill}
                          <button
                            className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:cursor-default disabled:text-slate-400"
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => addSuggestedSkill(skill)}
                          >
                            {alreadyAdded ? 'Added' : 'Add'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
            {skills.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Added skills">
                {skills.map((skill, index) => (
                  <li
                    key={`${skill}-${index}`}
                    className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm text-indigo-800"
                  >
                    {skill}
                    <button
                      className="font-semibold text-indigo-500 hover:text-indigo-800"
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() =>
                        setSkills((currentSkills) =>
                          currentSkills.filter(
                            (_, skillIndex) => skillIndex !== index,
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="border-t border-slate-200 pt-6">
            {pdfError && (
              <p className="mb-3 text-sm text-rose-600" role="alert">
                {pdfError}
              </p>
            )}
            <button
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              type="button"
              onClick={downloadResumePdf}
            >
              Download resume as PDF
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default App
