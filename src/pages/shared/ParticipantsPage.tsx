import { useLocation, useNavigate } from 'react-router-dom';
import Participants, { type Participant } from './Participants';

export default function ParticipantsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { participants?: Participant[]; title?: string } | null;

  const participants: Participant[] = state?.participants || [];
  const title = state?.title || 'Participants';

  return (
    <Participants
      participants={participants}
      onBack={() => navigate(-1)}
      title={title}
    />
  );
}
