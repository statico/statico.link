CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    private BOOLEAN DEFAULT FALSE
);

-- Example rows
INSERT INTO links (slug, url, private) VALUES
    ('foo', 'https://en.wikipedia.org/wiki/Foobar', FALSE),
    ('bar', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE)
ON CONFLICT (slug) DO NOTHING;
