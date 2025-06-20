import { searchByTask, initializeSearchSystem } from './embeddingSearch.js'

async function runTests() {
  try {
    console.log('=== Initializing System ===')
    await initializeSearchSystem()
    
    console.log('\n=== Running Search Tests ===')
    
    const testCases = [
      'analyse and predict chicken price',
    ]
    
    for (const task of testCases) {
      console.log(`\nSearching for: "${task}"`)
      await searchByTask(task)
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause between tests
    }
    
    console.log('\n=== All tests completed successfully ===')
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

// Run with proper error handling
runTests()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))