-- Create match_writings function for vector similarity search
-- This migration creates a function to find similar writings using vector embeddings

CREATE OR REPLACE FUNCTION match_writings (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  title text,
  body text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    writings.id,
    writings.title,
    writings.body,
    1 - (writings.embedding <=> query_embedding) as similarity
  FROM writings
  WHERE 1 - (writings.embedding <=> query_embedding) > match_threshold
  ORDER BY (writings.embedding <=> query_embedding) ASC
  LIMIT match_count;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION match_writings TO service_role;

