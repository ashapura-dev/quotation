-- Add a text-only per-container component type and a text value for each container size.
ALTER TABLE `rate_template_components`
  MODIFY `componentType` ENUM('FIXED', 'PERCENTAGE', 'PER_CONTAINER', 'PER_CONTAINER_TEXT', 'TEXT') NOT NULL;

ALTER TABLE `quotation_line_items`
  MODIFY `componentType` ENUM('FIXED', 'PERCENTAGE', 'PER_CONTAINER', 'PER_CONTAINER_TEXT', 'TEXT') NOT NULL;

ALTER TABLE `rate_template_container_rates`
  ADD COLUMN `textValue` TEXT NULL;
