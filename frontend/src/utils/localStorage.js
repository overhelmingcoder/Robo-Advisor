// Local storage utilities for saving user input history

const STORAGE_KEY = 'bdt_advisor_submissions'
const MAX_HISTORY = 3

export function getSavedSubmissions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveSubmission(profileData) {
  try {
    const history = getSavedSubmissions()
    const updated = [profileData, ...history].slice(0, MAX_HISTORY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearSubmissions() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail
  }
}
