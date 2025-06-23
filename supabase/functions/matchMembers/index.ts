import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { pipeline } from 'https://esm.sh/@xenova/transformers@2.17.2';

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Global embedder instance to reuse across requests
let embedder: any = null;

interface RequestBody {
  task: string;
  matchCount?: number;
}

interface Member {
  id: number;
  name: string;
  description?: string;
  skills?: string[];
}

interface MatchResult {
  id: number;
  name: string;
  description: string;
  skills: string[];
  match_score: number;
  distance: number;
  similarity: string;
}

/**
 * Initialize the Hugging Face embedding model
 */
async function initializeEmbedder(): Promise<void> {
  if (!embedder) {
    console.log('Loading Hugging Face embedding model...');
    try {
      embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
        revision: 'main',
        progress_callback: (progress: any) => {
          if (progress.total && progress.loaded) {
            console.log(`Loading model: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
          }
        }
      });
      console.log('Embedding model loaded successfully');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
      throw new Error('Failed to initialize embedding model');
    }
  }
}

/**
 * Generate enhanced embeddings with skill focus
 */
async function embedText(text: string): Promise<number[]> {
  try {
    if (!embedder) {
      await initializeEmbedder();
    }
    
    // Enhanced text processing for better skill matching
    const processedText = `Professional skills required: ${text}. 
                          Candidate should have experience with: ${text}. 
                          Looking for capabilities in: ${text}.`;
    
    const output = await embedder(processedText, {
      pooling: 'mean',
      normalize: true
    });
    
    // Ensure exactly 384 dimensions
    const embedding: number[] = Array.from(output.data).slice(0, 384);
    while (embedding.length < 384) {
      embedding.push(0);
    }
    
    return embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Enhanced skill-based search function
 */
async function searchByTask(supabase: any, task: string, matchCount: number = 5): Promise<MatchResult[]> {
  try {
    console.log(`Searching for candidates matching: "${task}"`);
    
    // Generate task embedding with skill-focused context
    const taskEmbedding = await embedText(
      `Seeking professionals with skills in: ${task}. ` +
      `Requires experience with: ${task}. ` +
      `Project needs capabilities in: ${task}.`
    );
    
    const { data: matches, error } = await supabase.rpc('match_members', {
      query_embedding: taskEmbedding,
      match_count: matchCount,
      similarity_threshold: 0.2  // Lower threshold to catch more potential matches
    });
    
    if (error) {
      console.error('Supabase RPC error:', error);
      throw error;
    }
    
    if (!matches || matches.length === 0) {
      console.log('No suitable matches found');
      return [];
    }
    
    // Enhanced results logging
    console.log('\nTOP MATCHES:');
    console.log('='.repeat(60));
    matches.forEach((member: any, index: number) => {
      const score = (member.match_score * 100).toFixed(1);
      const skills = member.skills?.length > 0 
        ? member.skills.join(', ') 
        : 'No skills listed';
      
      console.log(`\n#${index + 1}: ${member.name} (${score}% match)`);
      console.log(`- Skills: ${skills}`);
      console.log(`- Description: ${member.description || 'Not provided'}`);
      console.log(`- Similarity Score: ${member.distance?.toFixed(4) || 'N/A'}`);
    });
    console.log('='.repeat(60));
    
    // Transform results to include similarity percentage
    return matches.map((m: any) => ({
      ...m,
      similarity: `${(m.match_score * 100).toFixed(1)}%`
    }));
    
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!requestBody.task || typeof requestBody.task !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "task" field in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const task = requestBody.task.trim();
    const matchCount = requestBody.matchCount || 5;

    if (task.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Task description cannot be empty' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (matchCount < 1 || matchCount > 50) {
      return new Response(
        JSON.stringify({ error: 'matchCount must be between 1 and 50' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing AI matching request for task: "${task}" with matchCount: ${matchCount}`);

    // Initialize embedder and perform search
    await initializeEmbedder();
    const matches = await searchByTask(supabase, task, matchCount);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        task,
        matchCount,
        results: matches,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});