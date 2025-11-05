-- Create trigger on location_visits to update activity_patterns
CREATE TRIGGER trigger_update_activity_patterns
  AFTER INSERT ON public.location_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activity_patterns();