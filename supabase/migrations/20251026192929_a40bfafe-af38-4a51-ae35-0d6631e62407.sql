-- Add auto_accept_connections setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN auto_accept_connections boolean DEFAULT false;

-- Create connection_requests table for pending connection requests
CREATE TABLE public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable RLS on connection_requests
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_requests
CREATE POLICY "Users can view their own sent requests"
ON public.connection_requests
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Users can view requests sent to them"
ON public.connection_requests
FOR SELECT
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can create connection requests"
ON public.connection_requests
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update requests sent to them"
ON public.connection_requests
FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own sent requests"
ON public.connection_requests
FOR DELETE
USING (auth.uid() = sender_id);

-- Create index for faster lookups
CREATE INDEX idx_connection_requests_receiver ON public.connection_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX idx_connection_requests_sender ON public.connection_requests(sender_id);