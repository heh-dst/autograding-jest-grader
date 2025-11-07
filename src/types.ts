export type { FormattedTestResults } from '@jest/test-result'

export interface AssertionResult {
  fullName: string
  status:
    | 'passed'
    | 'failed'
    | 'skipped'
    | 'pending'
    | 'todo'
    | 'disabled'
    | 'focused'
  failureMessages: string[] | null
}

export interface TestResult {
  message: string
  name: string
  summary: string
  status: 'failed' | 'passed' | 'skipped' | 'focused'
  startTime: number
  endTime: number
  coverage: unknown
  assertionResults: AssertionResult[]
}

export type TestType = {
  name: string
  status: 'pass' | 'fail' | 'error'
  line_no?: number
  message?: string
  test_code?: string
  score: number
}

export type ResultType = {
  version: number
  max_score: number
  status: 'pass' | 'fail' | 'error'
  tests?: TestType[]
}
