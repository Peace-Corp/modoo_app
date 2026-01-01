-- Add documentation for print options in canvas_state
-- This migration adds comments to document the new print option functionality

COMMENT ON COLUMN saved_designs.canvas_state IS
'Fabric.js canvas.toJSON() output per side. Structure:
{
  "front": {
    "version": "5.3.0",
    "objects": [
      {
        "type": "i-text",
        "text": "Hello",
        "data": {
          "objectId": "front-123456789-abc",
          "printMethod": "embroidery" | "printing"
        },
        ...
      }
    ]
  },
  "back": { ... }
}

Each object can have a "data" property containing:
- objectId: Unique identifier for the object
- printMethod: Print method selection ("embroidery" or "printing")
  - Only applies to non-image objects (text, shapes, etc.)
  - Images do not have print method options
- estimatedCost: Calculated cost for this specific object (optional)
';

COMMENT ON COLUMN order_items.canvas_state IS
'Snapshot of Fabric.js canvas.toJSON() output per side at time of order. Structure:
{
  "front": {
    "version": "5.3.0",
    "objects": [
      {
        "type": "i-text",
        "text": "Hello",
        "data": {
          "objectId": "front-123456789-abc",
          "printMethod": "embroidery" | "printing"
        },
        ...
      }
    ]
  },
  "back": { ... }
}

Each object includes print method information in the data property for production purposes.
';
