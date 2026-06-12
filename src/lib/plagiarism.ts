/**
 * Calculates Jaccard similarity coefficient based on 3-grams of two normalized texts.
 */
export function calculateSimilarity(text1: string, text2: string, n = 3): number {
  if (!text1 || !text2) return 0
  
  // Clean text: lowercase and remove all whitespace
  const clean = (t: string) => t.toLowerCase().replace(/\s+/g, '')
  
  const c1 = clean(text1)
  const c2 = clean(text2)
  
  if (c1 === c2) return 100
  if (c1.length < n || c2.length < n) {
    return c1.includes(c2) || c2.includes(c1) ? 50 : 0
  }
  
  const getNGrams = (str: string) => {
    const ngrams = new Set<string>()
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.substring(i, i + n))
    }
    return ngrams
  }
  
  const ngrams1 = getNGrams(c1)
  const ngrams2 = getNGrams(c2)
  
  let intersection = 0
  ngrams1.forEach(gram => {
    if (ngrams2.has(gram)) {
      intersection++
    }
  })
  
  const union = ngrams1.size + ngrams2.size - intersection
  if (union === 0) return 0
  
  return Math.round((intersection / union) * 100)
}

export interface PlagiarismResult {
  maxSimilarity: number
  matchedStudentName?: string
  matchedStudentId?: string
}

/**
 * Checks a submission against a list of other submissions.
 * Returns the highest similarity percentage and the name of the matching student.
 */
export function checkPlagiarism(
  currentSubmissionId: string,
  currentContent: string,
  allSubmissions: Array<{ id: string; student_id: string; content?: string; description?: string; profiles?: { full_name?: string } }>
): PlagiarismResult {
  let maxSimilarity = 0
  let matchedStudentName = ''
  let matchedStudentId = ''
  
  if (!currentContent || !currentContent.trim()) {
    return { maxSimilarity: 0 }
  }
  
  for (const sub of allSubmissions) {
    if (sub.id === currentSubmissionId) continue
    
    const contentToCompare = sub.content || sub.description || ''
    if (!contentToCompare.trim()) continue
    
    const similarity = calculateSimilarity(currentContent, contentToCompare)
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      matchedStudentId = sub.student_id
      matchedStudentName = sub.profiles?.full_name || 'Басқа оқушы'
    }
  }
  
  return {
    maxSimilarity,
    matchedStudentName,
    matchedStudentId
  }
}
