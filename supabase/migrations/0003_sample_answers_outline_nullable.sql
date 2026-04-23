-- Phase 5: Allow direct generation without a pre-existing outline row.
-- The Generate Sample Answer UI drives generation from (questionId, poetKey)
-- rather than from an outline_id. Make outline_id and note_id nullable so
-- route-driven answers can be saved without those foreign keys.

alter table sample_answers alter column outline_id drop not null;
alter table sample_answers alter column note_id drop not null;
