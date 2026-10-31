DELETE FROM plans WHERE provider = 'borderpay';

ALTER TABLE plans DROP COLUMN provider;
