import React, { useState } from 'react'
import {Button, Card, Table} from 'react-bootstrap';
import { findSegmentRequests } from 'src/lib/api/segmentRoutes';
import { deleteUserSegmentById } from 'src/lib/api/userSegmentRequestRoutes';
import { ISegmentRequest } from 'src/lib/types/data/segment.type';
interface UserSegmentCardProps {
    segReq: ISegmentRequest[] | undefined;
    token: string;
}

export const UserSegmentCard: React.FC<UserSegmentCardProps> = ({segReq, token}) => {

    const [showReq, setShowReq] = useState(false);
    const [update, setUpdate] = useState(false);
        return (
        <Card>
            <Card.Header>Segment and SubSegment Requests<Button onClick={()=>{setShowReq(b=>!b)}}className="float-right" size="sm">{showReq ? "Hide Requests": "View Requests"}</Button></Card.Header>
            {showReq && 
            <Card.Body>
            <Table bordered hover>
            <thead>
                <tr>
                <th scope="col">UserId</th>
                <th scope="col">Country</th>
                <th scope="col">Province</th>
                <th scope="col">Segment Name</th>
                <th scope="col">Sub-Segment Name</th>
                <th scope="col">Controls</th>
                </tr>
            </thead>
            <tbody>
            {segReq?.map((req: ISegmentRequest, index: number) => (
                <tr key={req.id}>
                    <td>{req.userId}</td>
                    <td>{req.country}</td>
                    <td>{req.province}</td>
                    <td>{req.segmentName}</td>
                    <td>{req.subSegmentName}</td>
                    <td><Button size="sm" variant="outline-danger" onClick={()=>{
                        deleteUserSegmentById(String(req.id), token);
                        segReq.splice(index,1);
                        setUpdate(b=>!b);
                    }}>Delete</Button></td>
                </tr>
                ))}
            </tbody>
            </Table>
            </Card.Body>}
            
        </Card>
        );
}