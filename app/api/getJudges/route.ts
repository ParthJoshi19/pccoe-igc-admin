import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // console.log(body);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${body.token}`,
      },
    })

    // console.log(await response.text());

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch judges' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Add role "judge" to users if not exist
    if (data.users && Array.isArray(data.users)) {
      data.users = data.users.map((user: any) => ({
        ...user,
        role: user.role || 'judge'
      }))
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
