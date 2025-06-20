import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Hugging Face embedding pipeline
let embedder = null;

/**
 * Initialize the embedding model
 */
async function initializeEmbedder() {
  if (!embedder) {
    console.log('Loading Hugging Face embedding model...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
      revision: 'main',
      progress_callback: (progress) => {
        console.log(`Loading model: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
      }
    });
    console.log('Embedding model loaded');
  }
}

/**
 * Generate enhanced embeddings with skill focus
 */
async function embedText(text) {
  try {
    if (!embedder) await initializeEmbedder();
    
    // Enhanced text processing for better skill matching
    const processedText = `Professional skills required: ${text}. 
                          Candidate should have experience with: ${text}. 
                          Looking for capabilities in: ${text}.`;
    
    const output = await embedder(processedText, {
      pooling: 'mean',
      normalize: true
    });
    
    // Ensure exactly 384 dimensions
    const embedding = Array.from(output.data).slice(0, 384);
    while (embedding.length < 384) embedding.push(0);
    
    return embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Update all member embeddings with skill-focused representation
 */
async function updateMemberEmbeddings() {
  console.log('Starting embedding updates with skill focus...');
  
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, description, skills');
  
  if (error) {
    console.error('Error fetching members:', error);
    throw error;
  }
  
  if (!members || members.length === 0) {
    console.log('No members found');
    return;
  }
  
  console.log(`Processing ${members.length} members...`);
  
  for (const [index, member] of members.entries()) {
    try {
      // Create skill-focused text representation
      const skillText = Array.isArray(member.skills) 
        ? member.skills.join(', ') 
        : member.skills || '';
      
      const searchText = [
        `Professional: ${member.name || 'Unnamed'}`,
        `Skills: ${skillText}`,
        `Description: ${member.description || 'No description provided'}`,
        'Looking for candidates with these capabilities:'
      ].join('\n');
      
      if (!searchText.trim()) {
        console.log(`Skipping member ${member.id} - no searchable content`);
        continue;
      }
      
      const embedding = await embedText(searchText);
      
      const { error: updateError } = await supabase
        .from('members')
        .update({ embedding })
        .eq('id', member.id);
      
      if (updateError) {
        console.error(`Failed to update member ${member.id}:`, updateError);
      } else {
        console.log(`[${index + 1}/${members.length}] Updated ${member.name || 'member'} (ID: ${member.id})`);
      }
    } catch (error) {
      console.error(`Error processing member ${member.id}:`, error.message);
    }
  }
  
  console.log('Embedding update complete');
}

/**
 * Enhanced skill-based search function
 */
export async function searchByTask(task, matchCount = 5) {
  try {
    await initializeEmbedder();
    
    console.log(`\nSearching for candidates matching: "${task}"`);
    
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
    
    if (error) throw error;
    
    if (!matches || matches.length === 0) {
      console.log('No suitable matches found');
      return [];
    }
    
    // Enhanced results display
    console.log('\nTOP MATCHES:');
    console.log('='.repeat(60));
    matches.forEach((member, index) => {
      const score = (member.match_score * 100).toFixed(1);
      const skills = member.skills?.length > 0 
        ? member.skills.join(', ') 
        : 'No skills listed';
      
      console.log(`\n#${index + 1}: ${member.name} (${score}% match)`);
      console.log(`- Skills: ${skills}`);
      console.log(`- Description: ${member.description || 'Not provided'}`);
      console.log(`- Similarity Score: ${member.distance.toFixed(4)}`);
    });
    console.log('='.repeat(60));
    
    return matches.map(m => ({
      ...m,
      similarity: `${(m.match_score * 100).toFixed(1)}%`
    }));
    
  } catch (error) {
    console.error('Search failed:', error.message);
    return [];
  }
}

/**
 * Initialize the search system
 */
export async function initializeSearchSystem() {
  try {
    console.log('\nInitializing search system...');
    await initializeEmbedder();
    await updateMemberEmbeddings();
    console.log('\nSearch system ready with skill-based matching');
  } catch (error) {
    console.error('System initialization failed:', error);
    throw error;
  }
}

// Optional: Add cleanup for the embedding model
process.on('exit', () => {
  if (embedder) {
    console.log('Cleaning up embedding model...');
    // Model cleanup if needed
  }
});