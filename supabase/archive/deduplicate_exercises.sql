-- Deduplicate exercises in public.exercises
-- This script keeps the original canonical exercise row for each unique name and removes duplicate copies.

-- 1. If any workout_exercises or routine_exercises reference duplicate exercise rows, update them to point to the canonical ID.
WITH ranked_exercises AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name))
            ORDER BY 
                CASE 
                    -- Prioritize standard default exercise UUIDs if they exist
                    WHEN id IN (
                        '365482e8-06a3-4cef-bdc8-7d4999282222',
                        '01288946-78d6-4bd0-8fb3-46c985656408',
                        '45748440-c438-4e23-8c86-34689a6b9f61',
                        '03459cf3-053b-43ca-9d29-0900db19003d',
                        '0f5c3117-a7b8-4814-a034-a8a420cd1cd3',
                        'b1975fee-ab7d-46ff-b001-8d1ad4a00f43',
                        '4dcba39d-937a-4abb-9e46-5a65332a8afd',
                        'd57e4e38-3b6d-4ef6-9906-c696551d1d7b',
                        '21f982bb-d6e6-4ca2-8d51-9978960564d5',
                        'c7a48ac2-1665-4794-861f-70e4771be51e',
                        'a30a6c2c-29f8-4dc3-9649-dd90ecb4d847',
                        'a1956357-e6fc-491b-8d40-d54f57eed012',
                        'dfc03ed6-6831-4d00-a783-d807cf0ff86c',
                        '8a8b9cf9-3986-48a0-8b95-97ac97dd46d1',
                        '00fa46ce-7b3e-4711-bf6f-57057d21ccfd',
                        '1c835e73-c99b-49de-952e-5d0229df5215',
                        '30341c08-85ff-42ef-8834-b59d46a94bc7',
                        '2e8ae47a-45c4-4a99-9daa-2af63b4ea7af',
                        '9a20e0a2-510b-4810-9a11-8d7a8efc0f69',
                        '1208f0ed-0808-4622-aa2c-5432580be570',
                        '227e94de-6b0f-4737-9c9c-421898a350ba',
                        'b1d07991-f5d3-4969-8cf3-3773af583b04'
                    ) THEN 0
                    ELSE 1
                END ASC,
                created_at ASC,
                id ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
            PARTITION BY LOWER(TRIM(name))
            ORDER BY 
                CASE 
                    WHEN id IN (
                        '365482e8-06a3-4cef-bdc8-7d4999282222',
                        '01288946-78d6-4bd0-8fb3-46c985656408',
                        '45748440-c438-4e23-8c86-34689a6b9f61',
                        '03459cf3-053b-43ca-9d29-0900db19003d',
                        '0f5c3117-a7b8-4814-a034-a8a420cd1cd3',
                        'b1975fee-ab7d-46ff-b001-8d1ad4a00f43',
                        '4dcba39d-937a-4abb-9e46-5a65332a8afd',
                        'd57e4e38-3b6d-4ef6-9906-c696551d1d7b',
                        '21f982bb-d6e6-4ca2-8d51-9978960564d5',
                        'c7a48ac2-1665-4794-861f-70e4771be51e',
                        'a30a6c2c-29f8-4dc3-9649-dd90ecb4d847',
                        'a1956357-e6fc-491b-8d40-d54f57eed012',
                        'dfc03ed6-6831-4d00-a783-d807cf0ff86c',
                        '8a8b9cf9-3986-48a0-8b95-97ac97dd46d1',
                        '00fa46ce-7b3e-4711-bf6f-57057d21ccfd',
                        '1c835e73-c99b-49de-952e-5d0229df5215',
                        '30341c08-85ff-42ef-8834-b59d46a94bc7',
                        '2e8ae47a-45c4-4a99-9daa-2af63b4ea7af',
                        '9a20e0a2-510b-4810-9a11-8d7a8efc0f69',
                        '1208f0ed-0808-4622-aa2c-5432580be570',
                        '227e94de-6b0f-4737-9c9c-421898a350ba',
                        'b1d07991-f5d3-4969-8cf3-3773af583b04'
                    ) THEN 0
                    ELSE 1
                END ASC,
                created_at ASC,
                id ASC
        ) as canonical_id
    FROM public.exercises
),
duplicates AS (
    SELECT id, canonical_id FROM ranked_exercises WHERE rn > 1
)
UPDATE public.routine_exercises re
SET exercise_id = d.canonical_id
FROM duplicates d
WHERE re.exercise_id = d.id;

WITH ranked_exercises AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name))
            ORDER BY 
                CASE 
                    WHEN id IN (
                        '365482e8-06a3-4cef-bdc8-7d4999282222',
                        '01288946-78d6-4bd0-8fb3-46c985656408',
                        '45748440-c438-4e23-8c86-34689a6b9f61',
                        '03459cf3-053b-43ca-9d29-0900db19003d',
                        '0f5c3117-a7b8-4814-a034-a8a420cd1cd3',
                        'b1975fee-ab7d-46ff-b001-8d1ad4a00f43',
                        '4dcba39d-937a-4abb-9e46-5a65332a8afd',
                        'd57e4e38-3b6d-4ef6-9906-c696551d1d7b',
                        '21f982bb-d6e6-4ca2-8d51-9978960564d5',
                        'c7a48ac2-1665-4794-861f-70e4771be51e',
                        'a30a6c2c-29f8-4dc3-9649-dd90ecb4d847',
                        'a1956357-e6fc-491b-8d40-d54f57eed012',
                        'dfc03ed6-6831-4d00-a783-d807cf0ff86c',
                        '8a8b9cf9-3986-48a0-8b95-97ac97dd46d1',
                        '00fa46ce-7b3e-4711-bf6f-57057d21ccfd',
                        '1c835e73-c99b-49de-952e-5d0229df5215',
                        '30341c08-85ff-42ef-8834-b59d46a94bc7',
                        '2e8ae47a-45c4-4a99-9daa-2af63b4ea7af',
                        '9a20e0a2-510b-4810-9a11-8d7a8efc0f69',
                        '1208f0ed-0808-4622-aa2c-5432580be570',
                        '227e94de-6b0f-4737-9c9c-421898a350ba',
                        'b1d07991-f5d3-4969-8cf3-3773af583b04'
                    ) THEN 0
                    ELSE 1
                END ASC,
                created_at ASC,
                id ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
            PARTITION BY LOWER(TRIM(name))
            ORDER BY 
                CASE 
                    WHEN id IN (
                        '365482e8-06a3-4cef-bdc8-7d4999282222',
                        '01288946-78d6-4bd0-8fb3-46c985656408',
                        '45748440-c438-4e23-8c86-34689a6b9f61',
                        '03459cf3-053b-43ca-9d29-0900db19003d',
                        '0f5c3117-a7b8-4814-a034-a8a420cd1cd3',
                        'b1975fee-ab7d-46ff-b001-8d1ad4a00f43',
                        '4dcba39d-937a-4abb-9e46-5a65332a8afd',
                        'd57e4e38-3b6d-4ef6-9906-c696551d1d7b',
                        '21f982bb-d6e6-4ca2-8d51-9978960564d5',
                        'c7a48ac2-1665-4794-861f-70e4771be51e',
                        'a30a6c2c-29f8-4dc3-9649-dd90ecb4d847',
                        'a1956357-e6fc-491b-8d40-d54f57eed012',
                        'dfc03ed6-6831-4d00-a783-d807cf0ff86c',
                        '8a8b9cf9-3986-48a0-8b95-97ac97dd46d1',
                        '00fa46ce-7b3e-4711-bf6f-57057d21ccfd',
                        '1c835e73-c99b-49de-952e-5d0229df5215',
                        '30341c08-85ff-42ef-8834-b59d46a94bc7',
                        '2e8ae47a-45c4-4a99-9daa-2af63b4ea7af',
                        '9a20e0a2-510b-4810-9a11-8d7a8efc0f69',
                        '1208f0ed-0808-4622-aa2c-5432580be570',
                        '227e94de-6b0f-4737-9c9c-421898a350ba',
                        'b1d07991-f5d3-4969-8cf3-3773af583b04'
                    ) THEN 0
                    ELSE 1
                END ASC,
                created_at ASC,
                id ASC
        ) as canonical_id
    FROM public.exercises
),
duplicates AS (
    SELECT id, canonical_id FROM ranked_exercises WHERE rn > 1
)
UPDATE public.workout_exercises we
SET exercise_id = d.canonical_id
FROM duplicates d
WHERE we.exercise_id = d.id;

-- 2. Delete duplicate exercise rows
WITH ranked_exercises AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name))
            ORDER BY 
                CASE 
                    WHEN id IN (
                        '365482e8-06a3-4cef-bdc8-7d4999282222',
                        '01288946-78d6-4bd0-8fb3-46c985656408',
                        '45748440-c438-4e23-8c86-34689a6b9f61',
                        '03459cf3-053b-43ca-9d29-0900db19003d',
                        '0f5c3117-a7b8-4814-a034-a8a420cd1cd3',
                        'b1975fee-ab7d-46ff-b001-8d1ad4a00f43',
                        '4dcba39d-937a-4abb-9e46-5a65332a8afd',
                        'd57e4e38-3b6d-4ef6-9906-c696551d1d7b',
                        '21f982bb-d6e6-4ca2-8d51-9978960564d5',
                        'c7a48ac2-1665-4794-861f-70e4771be51e',
                        'a30a6c2c-29f8-4dc3-9649-dd90ecb4d847',
                        'a1956357-e6fc-491b-8d40-d54f57eed012',
                        'dfc03ed6-6831-4d00-a783-d807cf0ff86c',
                        '8a8b9cf9-3986-48a0-8b95-97ac97dd46d1',
                        '00fa46ce-7b3e-4711-bf6f-57057d21ccfd',
                        '1c835e73-c99b-49de-952e-5d0229df5215',
                        '30341c08-85ff-42ef-8834-b59d46a94bc7',
                        '2e8ae47a-45c4-4a99-9daa-2af63b4ea7af',
                        '9a20e0a2-510b-4810-9a11-8d7a8efc0f69',
                        '1208f0ed-0808-4622-aa2c-5432580be570',
                        '227e94de-6b0f-4737-9c9c-421898a350ba',
                        'b1d07991-f5d3-4969-8cf3-3773af583b04'
                    ) THEN 0
                    ELSE 1
                END ASC,
                created_at ASC,
                id ASC
        ) as rn
    FROM public.exercises
)
DELETE FROM public.exercises
WHERE id IN (
    SELECT id FROM ranked_exercises WHERE rn > 1
);

-- 3. Add a unique index on LOWER(TRIM(name)) where user_id IS NULL to prevent future duplicate seedings
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_default_name_lower 
ON public.exercises (LOWER(TRIM(name))) 
WHERE user_id IS NULL;
