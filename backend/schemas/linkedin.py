from pydantic import BaseModel


class LinkedinResultResponse(BaseModel):
    id: int
    workflow_execution_id: int
    vacancy_link: str
    title: str

    class Config:
        from_attributes = True


