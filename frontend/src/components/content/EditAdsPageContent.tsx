import { NONAME } from 'dns';
import { Formik, useFormik} from 'formik';
import React, { useContext, useState } from 'react'
import { Col, Container, Row, Form, Button, Alert } from 'react-bootstrap'
import { CreateAdvertisementInput } from 'src/lib/types/input/advertisement.input';
import { UserProfileContext } from '../../contexts/UserProfile.Context';
import { updateAdvertisement } from 'src/lib/api/advertisementRoutes';
import { IAdvertisement } from '../../lib/types/data/advertisement.type';
import { IFetchError } from '../../lib/types/types';
import { capitalizeString, handlePotentialAxiosError } from '../../lib/utilityFunctions';
import ImageUploader from 'react-images-upload';
import * as Yup from 'yup';
import { values } from 'lodash';

import '../../scss/content/_createAds.scss'



interface EditAdsPageContentProps {
    
};
//formik form input validation schema
const schema = Yup.object().shape({
  adType: Yup.string().required().oneOf(['BASIC','EXTRA']),
  adTitle: Yup.string().min(2,'title is too short!').max(50,'title is too long!').required('title is needed!'),
  adPosition: Yup.string().min(1,'position name can\'t be that short!').max(85,'position name is too long!').required('target position is needed!'),
  duration: Yup.number().min(1,'duration can\' be short than 1 day!').required('duration is needed!'),
  published: Yup.bool().required('you need to choose whether you want to publish your advertisement'),
  externalLink: Yup.string().url('please type in a valid url').required('external link is needed!')
});

const EditAdsPageContent: React.FC<EditAdsPageContentProps> = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [validated, setValidated] = useState(false);
    const [error, setError] = useState<IFetchError | null>(null);
    const [success,setSuccess] = useState<String>('');
  
    const { token } = useContext(UserProfileContext);

    const currentUrl = window.location.search;
    const search = new URLSearchParams(currentUrl);
    //console.log(currentUrl);
    const id = search.get('id');
    // console.log(id);

    //submit handler which calls api posting component to post form data of user input
    const submitHandler = async (values: CreateAdvertisementInput) => {
      try {
        console.log(values);
        // Set loading and error state
        setError(null);
        setIsLoading(true);
        //timeout period
        setTimeout(() => console.log("timeout"), 5000);
        //api component call
        const res = await updateAdvertisement(values, token, id);
        console.log(res);
        setSuccess('You submitted your advertisement successfully');
        setTimeout(()=> setSuccess(''),5000);
        //if successfully posted, set error to null
        setError(null);
        //reset the form
      } catch (error) {
        const genericMessage = 'An error occurred while trying to create an Idea.';
        const errorObj = handlePotentialAxiosError(genericMessage, error);
        setError(errorObj);
      } finally {
        setIsLoading(false)
      }
    };
    //initial values for form
    const initialValues: CreateAdvertisementInput ={
        adType: 'BASIC',
        adTitle: '',
        adPosition: '',
        duration: 0,
        published: false,
        externalLink: '',
        imagePath: '',
    }
  
    return (
      <Container className='edit-advertisement-page-content'>
        <Row className='justify-content-center'>
          <h1 className="pb-1 border-bottom display-6">Edit Advertisement</h1>
        </Row>
        <Row className='edit-advertisement-form-group justify-content-center'>
        <Col lg={10} >
          <Formik
            initialValues = {initialValues}
            validationSchema = {schema}
            onSubmit = {(values,actions) => {submitHandler(values).then(()=>{
              actions.setSubmitting(false);
              actions.resetForm({
                values:{
                  adType: 'BASIC',
                  adTitle: '',
                  adPosition: '',
                  duration: 0,
                  published: false,
                  externalLink: '',
                  imagePath: ''
                }
              });
            })}}
          >{({errors,touched,handleSubmit,handleChange,values,setFieldValue}) => (
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Form.Group controlId="submitAdvertisementType">
              <Form.Label>Select Advertisement Type</Form.Label>
              <Form.Control as="select" name="adType" onChange={handleChange} value={values.adType} isValid={touched.adType && !errors.adType}>
                <option key='0' value='BASIC'>BASIC</option>
                <option key='1' value='EXTRA'>EXTRA</option>
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="validateAdTitle">
              <Form.Label>Advertisement title</Form.Label>
              <Form.Control type="text" name="adTitle" onChange={handleChange} value={values.adTitle} placeholder="Your advertisement title" isInvalid={!!errors.adTitle}/>
              <Form.Control.Feedback type="invalid">{errors.adTitle}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="validateAdPosition">
              <Form.Label>Target position</Form.Label>
              <Form.Control type="text" name="adPosition" onChange={handleChange} value={values.adPosition} placeholder="Your target position" isInvalid={!!errors.adPosition}/>
              <Form.Control.Feedback type="invalid">{errors.adPosition}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="validateDuration">
              <Form.Label>Advertisement Duration in Days</Form.Label>
              <Form.Control type="number" name="duration" size="sm" onChange={handleChange} value={values.duration} placeholder="Your advertisement duration" isInvalid={!!errors.duration}/>
              <Form.Control.Feedback type="invalid">{errors.duration}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="validateExternalLink">
              <Form.Label>Provide external link for your advertisement</Form.Label>
              <Form.Control type="url" name="externalLink" onChange={handleChange} value={values.externalLink} placeholder="Your external link" isInvalid={!!errors.externalLink}/>
              <Form.Control.Feedback type="invalid">{errors.externalLink}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="validateimagePath">
              {/*Need a specific info for image size here*/}
              <ImageUploader name="imagePath" onChange={(picture) => {setFieldValue('imagePath',picture)}} imgExtension={['.jpg','.jpeg','.png','.webp']} buttonText="Choose your advertisement image" maxFileSize={10485760} label="Max file size 10mb, accepted:jpg, jpeg, png, webp" singleImage={true}/>
              <Form.Control.Feedback type="invalid">{errors.imagePath}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group>
              <Form.Check type="checkbox" label="Publish your advertisement" name="published" onChange={handleChange} isInvalid={!!errors.published} feedback={errors.published}/>
            </Form.Group>
            <Button
              block
              size="lg"
              type='submit'
              disabled={isLoading ? true : false}
            >
              {isLoading ? "Saving..." : "Submit your Advertisement!"}
            </Button>
          </Form>)}
          </Formik>
          {error && (
            <Alert variant='danger' className="error-alert">
              {error.message}
            </Alert>
          )}
          {success}
        </Col>
      </Row>
      </Container>
    );
  }

export default EditAdsPageContent