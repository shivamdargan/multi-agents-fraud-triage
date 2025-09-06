import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/evals/runs`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data.data || data);
  } catch (error) {
    console.error('Error fetching eval runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation runs' },
      { status: 500 }
    );
  }
}