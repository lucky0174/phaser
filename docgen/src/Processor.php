<?php
    class Processor
    {
        public $file;
        public $blocks;

        public $class;
        public $consts;
        public $methods;
        public $properties;

        public $processLog;

        /**
        * Processes the given JS source file.
        * 
        * @param mixed $file
        * @return Processor
        */
        public function __construct($file)
        {
            $this->consts = [];
            $this->methods = [];
            $this->properties = [];
            $this->file = $file;

            $this->scanFile();
        }

        public function log($text) {

            $this->processLog[] = $text;

        }

        public function getLog() {

            return $this->processLog;
            // return array_reverse($this->processLog);

        }

        /**
        * Scans the given JS source file and extracts blocks from it
        */
        private function scanFile() {

            $js = file($this->file);

            $scanningForOpen = true;
            $scanningForClose = false;

            $openLine = 0;
            $closeLine = 0;
            $chunk = [];

            //  Literally scan the JS file, line by line
            for ($i = 0; $i < count($js); $i++)
            {
                $line = trim($js[$i]);

                if ($scanningForOpen && $line === "/**")
                {
                    $scanningForOpen = false;
                    $scanningForClose = true;
                    $chunk = [];
                    $openLine = $i;
                }

                if ($scanningForClose && $line === "*/")
                {
                    $scanningForOpen = true;
                    $scanningForClose = false;
                    $closeLine = $i;

                    //  The first element is always the opening /** so remove it
                    array_shift($chunk);

                    if (isset($js[$i + 1]))
                    {
                        $this->blocks[] = new Block($openLine, $closeLine, $js[$i + 1], $chunk);
                    }
                }
                else
                {
                    $chunk[] = $line;
                }
            }

            //  Process the data into our documentation types
            for ($i = 0; $i < $this->total(); $i++)
            {
                if ($this->blocks[$i]->isClass)
                {
                    $this->class = new ClassDesc($this, $this->blocks[$i]);
                }
                else if ($this->blocks[$i]->isConst)
                {
                    $tempConst = new Constant($this, $this->blocks[$i]);

                    $this->consts[$tempConst->name] = $tempConst;
                }
                else if ($this->blocks[$i]->isMethod)
                {
                    $tempMethod = new Method($this, $this->blocks[$i]);

                    $this->methods[$tempMethod->name] = $tempMethod;
                }
                else if ($this->blocks[$i]->isProperty)
                {
                    $tempProperty = new Property($this, $this->blocks[$i]);

                    if ($tempProperty->corrupted === false)
                    {
                        $this->properties[$tempProperty->name] = $tempProperty;
                    }
                }
            }

            //  Alphabetically sort the arrays based on the key
            ksort($this->consts);
            ksort($this->methods);
            ksort($this->properties);

        }
        
        public function getArray()
        {
            $consts = [];
            $methods = [];
            $properties = [];

            foreach ($this->consts as $key => $value)
            {
                $consts[] = $value->getArray();
            }

            foreach ($this->methods as $key => $value)
            {
                $methods[] = $value->getArray();
            }

            foreach ($this->properties as $key => $value)
            {
                $properties[] = $value->getArray();
            }

            return array(
                'class' => $this->class->getArray(),
                'consts' => $consts,
                'methods' => $methods,
                'properties' => $properties
            );
            
        }
        
        public function getJSON()
        {
            return json_encode($this->getArray());
        }

        public function getConstsArray()
        {
            $out = [];

            for ($i = 0; $i < count($this->consts); $i++)
            {
                $out[] = $this->consts[$i]->getArray();
            }
            
            return $out;
        }

        /**
        * The total number of blocks scanned.
        */
        public function total()
        {
            return count($this->blocks);
        }

    }
?>