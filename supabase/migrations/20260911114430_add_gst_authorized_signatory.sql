-- Add GST number and authorized signatory fields to trade_applications table
alter table trade_applications add column gst_number text;
alter table trade_applications add column authorized_signatory text;
