import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params

  try {
    // Forward request to upload service
    const uploadServiceUrl = process.env.UPLOAD_SERVICE_URL || 'http://localhost:3006'
    const response = await fetch(`${uploadServiceUrl}/job-status/${jobId}`)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}

