import { Button, Card } from "react-bootstrap";
import { IProposalWithAggregations } from "../../lib/types/data/proposal.type";
import {
  capitalizeFirstLetterEachWord,
  timeDifference,
  truncateString,
} from "../../lib/utilityFunctions";
import { BsPeople, BsHeartHalf } from "react-icons/bs";
import { AiOutlineStar } from "react-icons/ai";
// import { FaRegThumbsUp, FaRegThumbsDown } from 'react-icons/fa'

interface proposalTileProps {
  proposalData: IProposalWithAggregations;
  showFooter: boolean;
  postType?: string;
}

const ProposalTile: React.FC<proposalTileProps> = ({
  proposalData,
  showFooter,
  postType,
}) => {
  const { idea, id } = proposalData;
  console.log("proposalData", proposalData);
  console.log("idea", idea);
  return (
    // <Card style={{ width: '18rem' }}>
    <Card>
      {/* <Card.Img variant="top" src="https://via.placeholder.com/300x150" /> */}
      <Card.Body>
        <div style={{ textAlign: "left", color: "gray" }}>{postType}</div>
        <Card.Title>{idea ? truncateString(idea.title, 50) : "N/A"}</Card.Title>
        <Card.Text>{truncateString(idea.description, 100)}</Card.Text>
        <div className="button-breakdown mt-3 d-flex justify-content-between align-items-center">
          <Card.Link href={`/proposals/${id}`}>
            <Button variant="primary">Read more</Button>
          </Card.Link>
          <div className="d-flex align-content-center">
            <div className="px-2 text-muted d-flex flex-column justify-content-center align-items-center">
              <AiOutlineStar className="" />
              <p className="mb-0 user-select-none">
                {idea.ratingAvg ? idea.ratingAvg.toFixed(2) : "Null"}
              </p>
            </div>
            <div className="px-2 text-muted d-flex flex-column justify-content-center align-items-center">
              <BsPeople className="" />
              <p className="mb-0 user-select-none">
                {idea.ratingCount + idea.commentCount}
              </p>
            </div>
            <div className="px-2 text-muted d-flex flex-column justify-content-center align-items-center">
              {/* Could possible have thumbs up and thumbs down but found heart to be clearer */}
              {/* <div className="">
                <FaRegThumbsUp />
                /
                <FaRegThumbsDown />
              </div> */}
              <BsHeartHalf />
              <p className="mb-0 user-select-none">
                {idea.posRatings}/{idea.negRatings}
              </p>
            </div>
          </div>
        </div>
      </Card.Body>
      {showFooter && (
        <Card.Footer>
          <small className="text-muted user-select-none">
            Updated {timeDifference(new Date(), new Date(idea.updatedAt))}
          </small>
          {/* <small className='text-muted'>, {capitalizeFirstLetterEachWord(segmentName)}{subSegmentName ? ` at ${capitalizeFirstLetterEachWord(subSegmentName)}`: ""}</small> */}
          {/* <small className='text-muted'>-- {firstName}@{streetAddress}</small> */}
        </Card.Footer>
      )}
    </Card>
  );
};

export default ProposalTile;
