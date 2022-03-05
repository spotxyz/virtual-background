import { useEffect, useState } from 'react'
import {
  getTFLiteModelFileName,
  SegmentationConfig,
} from '../helpers/segmentationHelper'

declare function createTFLiteModule(): Promise<TFLite>
declare function createTFLiteSIMDModule(): Promise<TFLite>

export interface TFLite extends EmscriptenModule {
  _getModelBufferMemoryOffset(): number
  _getInputMemoryOffset(): number
  _getInputHeight(): number
  _getInputWidth(): number
  _getInputChannelCount(): number
  _getOutputMemoryOffset(): number
  _getOutputHeight(): number
  _getOutputWidth(): number
  _getOutputChannelCount(): number
  _loadModel(bufferSize: number): number
  _runInference(): number
}

function useTFLite(segmentationConfig: SegmentationConfig) {
  const [tflite, setTFLite] = useState<TFLite>()
  const [tfliteSIMD, setTFLiteSIMD] = useState<TFLite>()
  const [selectedTFLite, setSelectedTFLite] = useState<TFLite>()
  const [isSIMDSupported, setSIMDSupported] = useState(false)

  useEffect(() => {
    async function loadTFLite() {
      createTFLiteModule().then(setTFLite)
      try {
        const createdTFLiteSIMD = await createTFLiteSIMDModule()
        setTFLiteSIMD(createdTFLiteSIMD)
        setSIMDSupported(true)
      } catch (error) {
        console.warn('Failed to create TFLite SIMD WebAssembly module.', error)
      }
    }

    loadTFLite()
  }, [])

  useEffect(() => {
    async function loadTFLiteModel() {
      if (
        !tflite ||
        (isSIMDSupported && !tfliteSIMD) ||
        (!isSIMDSupported && segmentationConfig.backend === 'wasmSimd') ||
        (segmentationConfig.model !== 'meet' &&
          segmentationConfig.model !== 'mlkit')
      ) {
        return
      }

      setSelectedTFLite(undefined)

      const newSelectedTFLite =
        segmentationConfig.backend === 'wasmSimd' ? tfliteSIMD : tflite

      if (!newSelectedTFLite) {
        throw new Error(
          `TFLite backend unavailable: ${segmentationConfig.backend}`
        )
      }

      const modelFileName = getTFLiteModelFileName(
        segmentationConfig.model,
        segmentationConfig.inputResolution
      )

      const modelResponse = await fetch(
        `${process.env.PUBLIC_URL}/virtual-background/models/${modelFileName}.tflite`
      )
      const model = await modelResponse.arrayBuffer()
      console.debug('Model buffer size:', model.byteLength)

      const modelBufferOffset = newSelectedTFLite._getModelBufferMemoryOffset()
      console.debug('Model buffer memory offset:', modelBufferOffset)
      console.debug('Loading model buffer...')
      newSelectedTFLite.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
      console.debug(
        '_loadModel result:',
        newSelectedTFLite._loadModel(model.byteLength)
      )

      console.debug(
        'Input memory offset:',
        newSelectedTFLite._getInputMemoryOffset()
      )
      console.debug('Input height:', newSelectedTFLite._getInputHeight())
      console.debug('Input width:', newSelectedTFLite._getInputWidth())
      console.debug('Input channels:', newSelectedTFLite._getInputChannelCount())

      console.debug(
        'Output memory offset:',
        newSelectedTFLite._getOutputMemoryOffset()
      )
      console.debug('Output height:', newSelectedTFLite._getOutputHeight())
      console.debug('Output width:', newSelectedTFLite._getOutputWidth())
      console.debug(
        'Output channels:',
        newSelectedTFLite._getOutputChannelCount()
      )

      setSelectedTFLite(newSelectedTFLite)
    }

    loadTFLiteModel()
  }, [
    tflite,
    tfliteSIMD,
    isSIMDSupported,
    segmentationConfig.model,
    segmentationConfig.backend,
    segmentationConfig.inputResolution,
  ])

  return { tflite: selectedTFLite, isSIMDSupported }
}

export default useTFLite
