import type * as importedExec from '@actions/exec'
import { jest } from '@jest/globals'

export const exec = jest.fn<typeof importedExec.exec>()
export const getExecOutput = jest.fn<typeof importedExec.getExecOutput>()
