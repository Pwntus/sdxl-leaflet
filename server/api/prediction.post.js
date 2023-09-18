import https from 'https'
import sharp from 'sharp'
import Replicate from 'replicate'
import * as Bytescale from '@bytescale/sdk'

const replicate = new Replicate({
  auth: useRuntimeConfig().replicateApiToken
})

const uploadApi = new Bytescale.UploadApi({
  apiKey: useRuntimeConfig().uploadApiKey
})

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: ${response.statusMessage}`))
          return
        }

        const data = []
        response.on('data', (chunk) => {
          data.push(chunk)
        })

        response.on('end', () => {
          resolve(Buffer.concat(data))
        })
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

const doesExist = async (url) => {
  try {
    return await downloadImage(url)
  } catch (e) {
    return false
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { input } = JSON.parse(body)
    const { coords, parent, left, top } = input

    // Abort if already exists (no need to upscale)
    // Create parent URL
    const URL = `https://upcdn.io/${
      useRuntimeConfig().uploadAccountId
    }/raw/sdxl-leaflet/${coords.z}/${coords.x}/${coords.y}.png`
    const exists = await doesExist(URL)
    if (exists) {
      console.log(
        `--- (${coords.z}, ${coords.x}, ${coords.y}) abort: tile already exists, redundant`
      )
      return
    }

    // Create parent URL
    const parentURL = `https://upcdn.io/${
      useRuntimeConfig().uploadAccountId
    }/raw/sdxl-leaflet/${parent.z}/${parent.x}/${parent.y}.png`

    // Fetch parent URL image
    const imageBuffer = await doesExist(parentURL)
    if (!imageBuffer) {
      console.log(
        `--- (${parent.z}, ${parent.x}, ${parent.y}) abort: parent tile does not exist, cannot create upscale`
      )
      return
    }

    // Use Sharp to crop parent tile
    const processedImageBuffer = await sharp(imageBuffer)
      .extract({
        left: left ? 0 : 128,
        top: top ? 0 : 128,
        width: 128,
        height: 128
      })
      .toBuffer()

    // Convert the processed image buffer to a base64-encoded data URI
    const base64Image = processedImageBuffer.toString('base64')
    const dataUri = `data:image/png;base64,${base64Image}`

    // https://replicate.com/nightmareai/real-esrgan
    console.log(`--- running: (${coords.z}, ${coords.x}, ${coords.y})`)
    const output = await replicate.run(
      'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
      {
        input: {
          image: dataUri,
          scale: 2
        }
      }
    )

    // Avoid redirect when downloading output image
    const rewritten_output = output.replace(
      'replicate.delivery/pbxt',
      'pbxt.replicate.delivery'
    )

    console.log(`--- (${coords.z}, ${coords.x}, ${coords.y}) output`)

    await uploadApi.uploadFromUrl({
      accountId: '12a1ybR',
      uploadFromUrlRequest: {
        url: rewritten_output,
        path: `sdxl-leaflet/${coords.z}/${coords.x}/${coords.y}.png`
      }
    })

    console.log(`--- (${coords.z}, ${coords.x}, ${coords.y}) uploaded`)

    return { output: rewritten_output }
  } catch (e) {
    console.log('error', e.message)
  }
})
