-- Enable realtime for connection_requests table
ALTER TABLE public.connection_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;