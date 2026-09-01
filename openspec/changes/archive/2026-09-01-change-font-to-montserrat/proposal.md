## Why

The product needs a consistent, explicit typography decision instead of relying on the current generic sans font from the app theme. Montserrat will give the management UI a clearer brand and visual baseline while preserving the existing operational layout and component system.

## What Changes

- Set Montserrat as the application-wide sans-serif UI font.
- Update the UI design system guidance so future UI work treats Montserrat as the required primary typeface.
- Preserve existing mono usage for VINs, stock numbers, internal identifiers, and other technical codes.
- Keep the current operational typography scale, density, hierarchy, and layout rules unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ui-design-system`: The design system typography requirement changes from using the existing generic app sans font to explicitly requiring Montserrat as the primary UI font.

## Impact

- Affects global app typography configuration, likely `next/font` setup and global CSS/theme font variables.
- Affects `docs/design-system/UI_GUIDELINES.md` typography guidance.
- Does not change APIs, database schema, permissions, business workflows, routing, or module-specific behavior.
