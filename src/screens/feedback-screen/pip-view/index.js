import Styled from './styles';
import useEndReason from '../../../hooks/use-end-reason';

const PiPView = () => {
  const title = useEndReason();

  return (
    <Styled.ContainerView>
      <Styled.Title>{title}</Styled.Title>
    </Styled.ContainerView>
  );
};

export default PiPView;
