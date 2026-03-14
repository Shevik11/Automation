from pydantic import BaseModel


class LinkedinResultResponse(BaseModel):
    id: int
    user_id: int | None = None
    workflow_execution_id: int | None = None
    vacancy_link: str
    title: str
    company_name: str | None = None
    company_linkedin_page: str | None = None
    detail: str | None = None
    hiring_manager_name: str | None = None

    class Config:
        from_attributes = True
