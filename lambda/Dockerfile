FROM public.ecr.aws/lambda/python:3.9

# Install system dependencies
RUN yum install -y gcc gcc-c++ make && \
    yum clean all

# Set up the function directory
WORKDIR /var/task

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# Use pip's binary preference to avoid compilation
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy function code
COPY translate.py .

# Set the handler
CMD ["translate.lambda_handler"]
